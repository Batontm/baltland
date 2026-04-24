import { createAdminClient } from "@/lib/supabase/admin"
import { syncPlotCoordinates } from "@/app/actions"

// ─── Типы ─────────────────────────────────────────────────

export interface SheetRow {
  row_number: number
  id?: string | null
  int_id?: number | null
  cadastral_number: string
  title: string
  description?: string
  price: number
  area_sotok: number
  district: string
  location: string
  distance_to_sea?: number | null
  land_status: string
  has_gas: boolean
  has_electricity: boolean
  has_water: boolean
  has_installment: boolean
  status: string // Доступен | Забронирован | Продан | Черновик
  is_featured: boolean
  ownership_type?: string
  lease_from?: string | null
  lease_to?: string | null
  vri_id?: string
  bundle_id?: string | null
  bundle_title?: string
  is_bundle_primary: boolean
  image_url?: string
  youtube_video_url?: string
  rutube_video_url?: string
  additional_cadastral_numbers?: string
}

export interface SyncRequest {
  rows: SheetRow[]
  deleted_cadastrals: string[]
}

export interface RowResult {
  row_number: number
  cadastral_number: string
  action: "added" | "updated" | "archived" | "error"
  id: string | null
  error: string | null
}

export interface SyncResponse {
  success: boolean
  results: RowResult[]
  summary: {
    added: number
    updated: number
    archived: number
    errors: number
  }
}

// ─── Валидация ────────────────────────────────────────────

const CADASTRAL_REGEX = /^\d{2}:\d{2}:\d{6,7}:\d+$/
const VALID_LAND_STATUSES = ["ИЖС", "СНТ", "ДНП", "ЛПХ"]
const VALID_STATUSES = ["Доступен", "Забронирован", "Продан", "Черновик"]

export function validateRow(row: SheetRow): string | null {
  if (!row.cadastral_number || !row.cadastral_number.trim()) {
    return "Кадастровый номер обязателен"
  }
  if (!CADASTRAL_REGEX.test(row.cadastral_number.trim())) {
    return `Неверный формат кадастрового номера: ${row.cadastral_number}`
  }
  if (!row.title || !row.title.trim()) {
    return "Название обязательно"
  }
  if (!row.price || row.price <= 0) {
    return "Цена должна быть > 0"
  }
  if (!row.area_sotok || row.area_sotok <= 0) {
    return "Площадь должна быть > 0"
  }
  if (!row.district || !row.district.trim()) {
    return "Район обязателен"
  }
  if (!row.location || !row.location.trim()) {
    return "Населённый пункт обязателен"
  }
  if (row.land_status && !VALID_LAND_STATUSES.includes(row.land_status.trim())) {
    return `Недопустимая категория земли: ${row.land_status}`
  }
  if (row.status && !VALID_STATUSES.includes(row.status.trim())) {
    return `Недопустимый статус: ${row.status}`
  }
  if (row.image_url && row.image_url.trim() && !row.image_url.trim().startsWith("https://") && !row.image_url.trim().startsWith("http://")) {
    return "URL фото должен начинаться с http(s)://"
  }
  return null
}

// ─── Маппинг статуса из таблицы → поля БД ─────────────────

interface StatusFields {
  is_active: boolean
  is_reserved: boolean
  status: string
}

function mapStatusToDb(sheetStatus: string): StatusFields {
  switch (sheetStatus.trim()) {
    case "Забронирован":
      return { is_active: true, is_reserved: true, status: "active" }
    case "Продан":
      return { is_active: false, is_reserved: false, status: "archived" }
    case "Черновик":
      return { is_active: false, is_reserved: false, status: "active" }
    case "Доступен":
    default:
      return { is_active: true, is_reserved: false, status: "active" }
  }
}

// ─── Маппинг строки таблицы → payload для БД ──────────────

function rowToDbPayload(row: SheetRow) {
  const statusFields = mapStatusToDb(row.status || "Черновик")

  const payload: Record<string, any> = {
    title: row.title.trim(),
    description: row.description?.trim() || null,
    price: row.price,
    area_sotok: row.area_sotok,
    district: row.district.trim(),
    location: row.location.trim(),
    distance_to_sea: row.distance_to_sea ?? null,
    land_status: row.land_status?.trim() || "ИЖС",
    has_gas: !!row.has_gas,
    has_electricity: !!row.has_electricity,
    has_water: !!row.has_water,
    has_installment: !!row.has_installment,
    is_featured: !!row.is_featured,
    is_active: statusFields.is_active,
    is_reserved: statusFields.is_reserved,
    cadastral_number: row.cadastral_number.trim(),
    updated_at: new Date().toISOString(),
  }

  // Опциональные поля — добавляем только если заполнены
  if (row.ownership_type?.trim()) {
    payload.ownership_type = row.ownership_type.trim()
  }
  if (row.lease_from) {
    payload.lease_from = row.lease_from
  }
  if (row.lease_to) {
    payload.lease_to = row.lease_to
  }
  if (row.vri_id?.trim()) {
    payload.vri_id = row.vri_id.trim()
  }
  if (row.bundle_id?.trim()) {
    payload.bundle_id = row.bundle_id.trim()
  }
  if (row.bundle_title?.trim()) {
    payload.bundle_title = row.bundle_title.trim()
  }
  if (row.is_bundle_primary !== undefined) {
    payload.is_bundle_primary = !!row.is_bundle_primary
  }
  if (row.image_url?.trim()) {
    payload.image_url = row.image_url.trim()
  }
  if (row.youtube_video_url?.trim()) {
    payload.youtube_video_url = row.youtube_video_url.trim()
  }
  if (row.rutube_video_url?.trim()) {
    payload.rutube_video_url = row.rutube_video_url.trim()
  }
  if (row.additional_cadastral_numbers?.trim()) {
    payload.additional_cadastral_numbers = row.additional_cadastral_numbers
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
  }

  return payload
}

// ─── Основная функция синхронизации ───────────────────────

export async function syncFromSheets(request: SyncRequest): Promise<SyncResponse> {
  const supabase = createAdminClient()
  const results: RowResult[] = []
  let added = 0
  let updated = 0
  let archived = 0
  let errors = 0

  // 1. Обработка строк (upsert)
  for (const row of request.rows) {
    const validation = validateRow(row)
    if (validation) {
      results.push({
        row_number: row.row_number,
        cadastral_number: row.cadastral_number || "",
        action: "error",
        id: null,
        error: validation,
      })
      errors++
      continue
    }

    try {
      const cadastral = row.cadastral_number.trim()

      // Найти существующий участок по кадастровому номеру
      const { data: existing, error: findError } = await supabase
        .from("land_plots")
        .select("id, image_url")
        .eq("cadastral_number", cadastral)
        .limit(1)
        .maybeSingle()

      if (findError) {
        results.push({
          row_number: row.row_number,
          cadastral_number: cadastral,
          action: "error",
          id: null,
          error: "Ошибка поиска: " + findError.message,
        })
        errors++
        continue
      }

      const payload = rowToDbPayload(row)

      if (existing) {
        // UPDATE — не перезаписываем image_url если в таблице пусто
        if (!payload.image_url && existing.image_url) {
          delete payload.image_url
        }

        // Не перезаписываем координаты и sync_error
        // (они управляются другими процессами)

        const { error: updateError } = await supabase
          .from("land_plots")
          .update(payload)
          .eq("id", existing.id)

        if (updateError) {
          results.push({
            row_number: row.row_number,
            cadastral_number: cadastral,
            action: "error",
            id: existing.id,
            error: "Ошибка обновления: " + updateError.message,
          })
          errors++
        } else {
          results.push({
            row_number: row.row_number,
            cadastral_number: cadastral,
            action: "updated",
            id: existing.id,
            error: null,
          })
          updated++
        }
      } else {
        // INSERT
        const { data: inserted, error: insertError } = await supabase
          .from("land_plots")
          .insert(payload)
          .select("id")
          .single()

        if (insertError) {
          results.push({
            row_number: row.row_number,
            cadastral_number: cadastral,
            action: "error",
            id: null,
            error: "Ошибка добавления: " + insertError.message,
          })
          errors++
        } else {
          results.push({
            row_number: row.row_number,
            cadastral_number: cadastral,
            action: "added",
            id: inserted.id,
            error: null,
          })
          added++

          // Fire and forget: sync coordinates + auto-generate map image
          syncPlotCoordinates(inserted.id, cadastral).catch((e) =>
            console.error(`[sheets-sync] Failed to sync coordinates for ${cadastral}:`, e)
          )
        }
      }
    } catch (err: any) {
      results.push({
        row_number: row.row_number,
        cadastral_number: row.cadastral_number || "",
        action: "error",
        id: null,
        error: "Внутренняя ошибка: " + err.message,
      })
      errors++
    }
  }

  // 2. Обработка удалений (мягкое удаление)
  for (const cadastral of request.deleted_cadastrals) {
    try {
      const { data: existing, error: findError } = await supabase
        .from("land_plots")
        .select("id")
        .eq("cadastral_number", cadastral.trim())
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()

      if (findError || !existing) continue

      const { error: archiveError } = await supabase
        .from("land_plots")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (!archiveError) {
        results.push({
          row_number: 0,
          cadastral_number: cadastral.trim(),
          action: "archived",
          id: existing.id,
          error: null,
        })
        archived++
      }
    } catch (err: any) {
      console.error("[sheets-sync] Archive error:", cadastral, err.message)
    }
  }

  return {
    success: errors === 0,
    results,
    summary: { added, updated, archived, errors },
  }
}
