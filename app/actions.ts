"use server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { readFile, writeFile } from "fs/promises"
import { createHash } from "crypto"
import path from "path"
import { KALININGRAD_DISTRICTS } from "@/lib/types"
import type {
  LandPlot,
  Subscriber,
  Lead,
  User,
  News,
  CommercialProposal,
  CommercialProposalWithDetails,
  OrganizationSettings,
  Settlement,
  LEAD_STATUS_OPTIONS,
  LAND_STATUS_OPTIONS,
  USER_ROLE_OPTIONS,
  LandingBenefitsSection,
  LandingBenefitItem,
  LandPlotData,
  SyncDetail,
  SyncResult,
  FaqItem,
  LegalContent,
  NspdSettings,
} from "@/lib/types"

import { clearAdminSessionCookie } from "@/lib/admin-auth"
import { notifyNewApplication, notifyAdminError, sendMessageToAdmin, sendMessageWithButtons } from "@/lib/telegram"
import { NspdClient } from "@/lib/nspd-service/nspd-client"
import { KALININGRAD_SETTLEMENTS } from "@/lib/kaliningrad-settlements"
import { detectDistrict, detectDistrictByCadastralPrefix } from "@/lib/district-detector"
import { generateStaticMapImage } from "@/lib/static-map-generator"

function isValidCoordinate(lat: number | null | undefined, lon: number | null | undefined): boolean {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return false;
  // Basic validation for the region (Kaliningrad is around lat 54, lon 20)
  // But more generally, 0,0 is almost always a sign of a bug or missing data in this context.
  if (lat === 0 && lon === 0) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return true;
}

// ============ LAND PLOTS ============

let localCoordsIndexPromise: Promise<
  Map<string, { x?: number; y?: number; geometry?: any }>
> | null = null

async function getLocalCoordsIndex(): Promise<Map<string, { x?: number; y?: number; geometry?: any }>> {
  if (localCoordsIndexPromise) return localCoordsIndexPromise

  localCoordsIndexPromise = (async () => {
    try {
      const filePath = path.join(process.cwd(), "land-plots-coordinates.json")
      const raw = await readFile(filePath, "utf8")
      const parsed = JSON.parse(raw) as {
        rows?: Array<{ cadastral_number?: string; x?: number; y?: number; geometry?: any }>
      }
      const out = new Map<string, { x?: number; y?: number; geometry?: any }>()
      for (const r of parsed.rows || []) {
        const cad = String(r?.cadastral_number || "").trim()
        if (!cad) continue
        const x = typeof r.x === "number" ? r.x : Number(r.x)
        const y = typeof r.y === "number" ? r.y : Number(r.y)
        const valid = isValidCoordinate(y, x)
        out.set(cad, {
          x: valid ? Number(x) : undefined,
          y: valid ? Number(y) : undefined,
          geometry: (r as any).geometry,
        })
      }
      return out
    } catch (e) {
      console.error("[getLocalCoordsIndex] Failed to read land-plots-coordinates.json:", e)
      return new Map()
    }
  })()

  return localCoordsIndexPromise
}

async function applyLocalCoordsFromFile(
  plotId: string,
  cadastralNumber: string,
): Promise<"none" | "center" | "contour"> {
  const cad = String(cadastralNumber || "").trim()
  if (!plotId || !cad) return "none"

  const idx = await getLocalCoordsIndex()
  const entry = idx.get(cad)
  if (!entry) return "none"

  const geometry = entry.geometry ?? null
  const geometryType = String(geometry?.type || "").trim()
  const hasContour = geometryType === "Polygon" || geometryType === "MultiPolygon"
  const hasCenter = isValidCoordinate(entry.y, entry.x)

  if (!hasContour) {
    if (!hasCenter) return "none"
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("land_plots")
      .update({
        has_coordinates: true,
        center_lon: entry.x,
        center_lat: entry.y,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plotId)
    if (error) {
      console.error("[applyLocalCoordsFromFile] Center update failed:", error)
      return "none"
    }
    return "center"
  }

  if (!Array.isArray(geometry?.coordinates)) return "none"

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("land_plots")
    .update({
      coordinates_json: geometry,
      geometry_type: geometryType,
      has_contour: true,
      has_coordinates: true,
      center_lon: hasCenter ? entry.x : null,
      center_lat: hasCenter ? entry.y : null,
      sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", plotId)

  if (error) {
    console.error("[applyLocalCoordsFromFile] Geometry update failed:", error)
    return "none"
  }

  // Auto-generate map image
  generatePlotMapImage(plotId).catch((e) =>
    console.error(`[applyLocalCoordsFromFile] Failed to trigger image generation for ${plotId}:`, e)
  )

  return "contour"
}

export async function testNspdConnection(params?: {
  cadastralNumber?: string
}): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  try {
    const cadastralNumber = String(params?.cadastralNumber || "").trim()
    if (!cadastralNumber) {
      return { success: false, message: "Не указан кадастровый номер для теста" }
    }

    const settings = await getOrganizationSettings()
    const nspd = (settings as any)?.nspd_settings as
      | { proxy?: string | null; timeout_ms?: number | null; coords_order?: "lat,lon" | "lon,lat" | null }
      | null

    const client = new NspdClient({
      proxy: nspd?.proxy ?? null,
    })

    const { data, error } = await client.getObjectInfo(cadastralNumber, nspd?.coords_order ?? "lat,lon")
    if (!data) {
      return {
        success: false,
        message: error || "НСПД не вернул данные по объекту",
        details: { error, cadastralNumber },
      }
    }

    return {
      success: true,
      message: "Подключение к НСПД успешно",
      details: {
        cadastralNumber: data.cadastralNumber,
        address: data.address,
        centroid_wgs84: data.centroid_wgs84,
        geometry_type: data.geometry_type,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || String(err),
      details: { name: err?.name, cause: err?.cause },
    }
  }
}

export async function retryMissingPlotGeometry(limit = 30): Promise<{
  success: boolean
  processed: number
  found: number
}> {
  const supabase = createAdminClient()

  try {
    const { data: plots, error } = await supabase
      .from("land_plots")
      .select("id, cadastral_number")
      .eq("is_active", true)
      .not("cadastral_number", "is", null)
      .or("coordinates_json.is.null,has_contour.is.null,has_contour.eq.false,has_coordinates.is.null,has_coordinates.eq.false")
      .limit(limit)

    if (error) throw error
    if (!plots || plots.length === 0) return { success: true, processed: 0, found: 0 }

    let found = 0
    for (const plot of plots) {
      const ok = await syncPlotCoordinates((plot as any).id, (plot as any).cadastral_number)
      if (ok) found++
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    revalidatePath("/admin")
    return { success: true, processed: plots.length, found }
  } catch (e) {
    console.error("[retryMissingPlotGeometry] Error:", e)
    return { success: false, processed: 0, found: 0 }
  }
}

async function getConfiguredNspdClient(): Promise<{
  client: NspdClient
  coordsOrder: "lat,lon" | "lon,lat"
}> {
  const settings = await getOrganizationSettings()
  const nspd = (settings as any)?.nspd_settings as
    | {
      proxy?: string | null
      proxy_auth?: string | null
      proxy_simple?: string | null
      timeout_ms?: number | null
      coords_order?: "lat,lon" | "lon,lat" | null
    }
    | null

  const coordsOrder: "lat,lon" | "lon,lat" = nspd?.coords_order === "lon,lat" ? "lon,lat" : "lat,lon"

  // Use proxy_auth first, then proxy_simple, then legacy proxy field
  const proxyUrl = nspd?.proxy_auth?.trim() || nspd?.proxy_simple?.trim() || nspd?.proxy?.trim() || null

  if (proxyUrl) {
    console.log(`[getConfiguredNspdClient] Using proxy: ${proxyUrl.replace(/:[^:@]+@/, ':***@')}`)
  }

  const client = new NspdClient({
    proxy: proxyUrl,
  })
  return { client, coordsOrder }
}

export async function syncLocalCoordinatesFileFromDb(): Promise<{
  success: boolean
  message: string
  added: number
  total: number
}> {
  try {
    const filePath = path.join(process.cwd(), "land-plots-coordinates.json")
    const raw = await readFile(filePath, "utf8")
    const parsed = JSON.parse(raw) as {
      exported_at?: string
      total?: number
      rows?: Array<{ cadastral_number?: string; x?: number; y?: number; has_coordinates?: boolean; geometry?: any }>
    }

    const existingRows = Array.isArray(parsed.rows) ? parsed.rows : []
    const idx = new Map<string, { x: number; y: number; geometry?: any }>()
    for (const r of existingRows) {
      const cad = String(r.cadastral_number || "").trim()
      if (!cad) continue
      const x = typeof r.x === "number" ? r.x : Number(r.x)
      const y = typeof r.y === "number" ? r.y : Number(r.y)
      if (Number.isFinite(x) && Number.isFinite(y)) idx.set(cad, { x, y, geometry: (r as any).geometry })
    }

    const supabase = createAdminClient()
    const { data: plots, error } = await supabase
      .from("land_plots")
      .select("cadastral_number, center_lat, center_lon, has_coordinates, coordinates_json")
      .not("cadastral_number", "is", null)

    if (error) {
      return { success: false, message: `Ошибка чтения участков из БД: ${error.message}`, added: 0, total: existingRows.length }
    }

    let added = 0
    let updated = 0
    const outRows = existingRows.slice()

    const outIdx = new Map<string, number>()
    for (let i = 0; i < outRows.length; i++) {
      const cad = String(outRows[i]?.cadastral_number || "").trim()
      if (!cad) continue
      outIdx.set(cad, i)
    }

    for (const p of plots || []) {
      const cad = String((p as any).cadastral_number || "").trim()
      if (!cad) continue
      const lat = typeof (p as any).center_lat === "number" ? (p as any).center_lat : Number((p as any).center_lat)
      const lon = typeof (p as any).center_lon === "number" ? (p as any).center_lon : Number((p as any).center_lon)
      const geometry = (p as any).coordinates_json ?? null

      const existingAt = outIdx.get(cad)
      if (existingAt !== undefined) {
        const row = outRows[existingAt] as any
        let changed = false

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          const rx = typeof row.x === "number" ? row.x : Number(row.x)
          const ry = typeof row.y === "number" ? row.y : Number(row.y)
          if (!Number.isFinite(rx) || !Number.isFinite(ry)) {
            row.x = lon
            row.y = lat
            row.has_coordinates = true
            changed = true
          }
        }

        if (!row.geometry && geometry) {
          row.geometry = geometry
          row.has_coordinates = true
          changed = true
        }

        if (changed) updated++
        continue
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      const newRow: any = { cadastral_number: cad, x: lon, y: lat, has_coordinates: true }
      if (geometry) newRow.geometry = geometry
      outRows.push(newRow)
      idx.set(cad, { x: lon, y: lat, geometry: geometry || undefined })
      added++
    }

    outRows.sort((a, b) => String(a.cadastral_number || "").localeCompare(String(b.cadastral_number || "")))

    const payload = {
      exported_at: new Date().toISOString(),
      total: outRows.length,
      rows: outRows,
    }

    await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8")
    return {
      success: true,
      message: `Файл обновлён: добавлено ${added}, обновлено ${updated}`,
      added,
      total: outRows.length,
    }
  } catch (err: any) {
    return { success: false, message: err?.message || String(err), added: 0, total: 0 }
  }
}

/**
 * Generate map image for a plot using its polygon geometry
 */
export async function generatePlotMapImage(plotId: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    const { data: plot, error } = await supabase
      .from("land_plots")
      .select("id, coordinates_json, ownership_type, is_reserved")
      .eq("id", plotId)
      .single()

    if (error || !plot) {
      console.error("[generatePlotMapImage] Plot not found:", plotId)
      return false
    }

    let geometry = (plot as any).coordinates_json
    if (typeof geometry === "string") {
      try {
        geometry = JSON.parse(geometry)
      } catch {
        console.error("[generatePlotMapImage] Invalid geometry JSON")
        return false
      }
    }

    if (!geometry?.type || !geometry?.coordinates) {
      console.log("[generatePlotMapImage] No valid geometry for plot:", plotId)
      return false
    }

    // Generate map image
    const imageBuffer = await generateStaticMapImage({
      geometry,
      ownershipType: (plot as any).ownership_type,
      isReserved: (plot as any).is_reserved,
      width: 600,
      height: 400,
      mapType: "satellite",
    })

    // Upload to Supabase Storage
    const fileName = `plot-map-${plotId}.png`
    const storagePath = `plot-map-images/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("land-images")
      .upload(storagePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      })

    if (uploadError) {
      console.error("[generatePlotMapImage] Upload error:", uploadError)
      return false
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("land-images").getPublicUrl(storagePath)

    if (!urlData?.publicUrl) {
      console.error("[generatePlotMapImage] Failed to get public URL")
      return false
    }

    // Update plot
    const { error: updateError } = await supabase
      .from("land_plots")
      .update({
        image_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plotId)

    if (updateError) {
      console.error("[generatePlotMapImage] Update error:", updateError)
      return false
    }

    console.log("[generatePlotMapImage] Generated map image for plot:", plotId)
    return true
  } catch (err: any) {
    console.error("[generatePlotMapImage] Error:", err?.message || err)
    return false
  }
}

export async function createPlot(data: Partial<LandPlot>): Promise<LandPlot | null> {
  const supabase = createAdminClient()

  const { data: plot, error } = await supabase
    .from("land_plots")
    .insert({
      title: data.title,
      description: data.description,
      price: data.price,
      area_sotok: data.area_sotok,
      district: data.district,
      location: data.location,
      land_status: data.land_status,
      has_gas: data.has_gas,
      has_electricity: data.has_electricity,
      has_water: data.has_water,
      has_installment: data.has_installment,
      image_url: data.image_url,
      youtube_video_url: (data as any).youtube_video_url,
      rutube_video_url: (data as any).rutube_video_url,
      is_featured: data.is_featured,
      is_reserved: data.is_reserved,
      bundle_id: data.bundle_id,
      is_bundle_primary: data.is_bundle_primary,
      is_active: data.is_active,
      cadastral_number: data.cadastral_number,
      ownership_type: data.ownership_type,
      lease_from: data.lease_from,
      lease_to: data.lease_to,
      vri_id: data.vri_id,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating plot:", error)
    throw new Error(error.message)
  }

  if (!plot.image_url) {
    // Try to generate map image after coordinates are synced
    // Fire and forget - will be generated when coordinates are available
    if (plot.coordinates_json) {
      generatePlotMapImage(plot.id).catch(console.error)
    }
  }

  revalidatePath("/")
  revalidatePath("/admin")

  if (plot.id && plot.cadastral_number) {
    // Fire and forget coordinate sync
    syncPlotCoordinates(plot.id, plot.cadastral_number).catch(console.error)
  }

  return plot as LandPlot
}

export async function getLandPlotsByBundleId(bundleId: string): Promise<LandPlot[]> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase.from("land_plots").select("*").eq("bundle_id", bundleId).eq("is_active", true)

    if (error) {
      console.error("[v0] Error fetching bundle plots:", error)
      return []
    }

    return (data as LandPlot[]) || []
  } catch (error) {
    console.error("[v0] Error in getLandPlotsByBundleId:", error)
    return []
  }
}

export async function getLandPlotBundleById(id: string): Promise<{ plot: LandPlot; bundlePlots: LandPlot[] } | null> {
  const plot = await getLandPlotById(id)
  if (!plot) return null

  if (!plot.bundle_id) {
    return { plot, bundlePlots: [plot] }
  }

  const bundlePlots = await getLandPlotsByBundleId(plot.bundle_id)
  return { plot, bundlePlots: bundlePlots.length ? bundlePlots : [plot] }
}

/**
 * Get similar plots by district and price range
 */
export async function getSimilarPlots(
  plotId: string,
  district: string | null,
  limit: number = 3
): Promise<LandPlot[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from("land_plots")
    .select("*")
    .eq("is_active", true)
    .neq("id", plotId)
    .limit(limit)

  // Filter by same district if available
  if (district) {
    query = query.eq("district", district)
  }

  // Order by newest first
  query = query.order("created_at", { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error("[getSimilarPlots] Error:", error)
    return []
  }

  return (data || []) as LandPlot[]
}

export async function updatePlot(id: string, data: Partial<LandPlot>): Promise<LandPlot | null> {
  const supabase = createAdminClient()

  // Perform update without select to avoid PGRST116 error
  const { error: updateError } = await supabase
    .from("land_plots")
    .update({
      title: data.title,
      description: data.description,
      price: data.price,
      area_sotok: data.area_sotok,
      district: data.district,
      location: data.location,
      land_status: data.land_status,
      has_gas: data.has_gas,
      has_electricity: data.has_electricity,
      has_water: data.has_water,
      has_installment: data.has_installment,
      image_url: data.image_url,
      youtube_video_url: (data as any).youtube_video_url,
      rutube_video_url: (data as any).rutube_video_url,
      is_featured: data.is_featured,
      is_reserved: data.is_reserved,
      bundle_id: data.bundle_id,
      is_bundle_primary: data.is_bundle_primary,
      is_active: data.is_active,
      cadastral_number: data.cadastral_number,
      additional_cadastral_numbers: (data as any).additional_cadastral_numbers,
      ownership_type: data.ownership_type,
      lease_from: data.lease_from,
      lease_to: data.lease_to,
      vri_id: data.vri_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) {
    console.error("Error updating plot:", updateError)
    throw new Error(updateError.message)
  }

  // Fetch the updated plot separately
  const { data: plot, error: selectError } = await supabase.from("land_plots").select("*").eq("id", id).single()

  if (selectError || !plot) {
    console.error("Error fetching updated plot:", selectError)
    throw new Error(selectError?.message || "Plot not found after update")
  }

  revalidatePath("/")
  revalidatePath("/admin")

  if (plot.cadastral_number) {
    // Re-sync coordinates if cadastral number is provided/changed
    syncPlotCoordinates(plot.id, plot.cadastral_number).catch(console.error)
  }

  return plot as LandPlot
}

export async function deletePlot(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("land_plots").delete().eq("id", id)

  if (error) {
    console.error("Error deleting plot:", error)
    throw new Error(error.message)
  }

  revalidatePath("/")
  revalidatePath("/admin")
}

/**
 * Объединить участок-источник с целевым участком.
 * - КН источника добавляется в additional_cadastral_numbers целевого
 * - Координаты источника добавляются в additional_coordinates целевого
 * - Участок-источник деактивируется
 */
export async function mergePlots(
  sourceId: string,
  targetId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  try {
    // 1. Получить оба участка
    const { data: source, error: sourceError } = await supabase
      .from("land_plots")
      .select("*")
      .eq("id", sourceId)
      .single()

    if (sourceError || !source) {
      return { success: false, error: "Участок-источник не найден" }
    }

    const { data: target, error: targetError } = await supabase
      .from("land_plots")
      .select("*")
      .eq("id", targetId)
      .single()

    if (targetError || !target) {
      return { success: false, error: "Целевой участок не найден" }
    }

    // 2. Подготовить обновлённые массивы
    const existingCadastralNumbers: string[] = target.additional_cadastral_numbers || []
    const existingCoordinates: any[] = target.additional_coordinates || []

    // Добавить КН источника
    const newCadastralNumbers = [...existingCadastralNumbers]
    if (source.cadastral_number && !newCadastralNumbers.includes(source.cadastral_number)) {
      newCadastralNumbers.push(source.cadastral_number)
    }

    // Добавить координаты источника
    const newCoordinates = [...existingCoordinates]
    if (source.cadastral_number) {
      newCoordinates.push({
        cadastral_number: source.cadastral_number,
        center_lat: source.center_lat,
        center_lon: source.center_lon,
        coordinates_json: source.coordinates_json,
        area_sotok: source.area_sotok,
      })
    }

    // 3. Обновить целевой участок
    const { error: updateError } = await supabase
      .from("land_plots")
      .update({
        additional_cadastral_numbers: newCadastralNumbers,
        additional_coordinates: newCoordinates,
        area_sotok: (Number(target.area_sotok) || 0) + (Number(source.area_sotok) || 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetId)

    if (updateError) {
      console.error("Error updating target plot:", updateError)
      return { success: false, error: "Ошибка обновления целевого участка" }
    }

    // 4. Деактивировать участок-источник
    const { error: deactivateError } = await supabase
      .from("land_plots")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId)

    if (deactivateError) {
      console.error("Error deactivating source plot:", deactivateError)
      return { success: false, error: "Ошибка деактивации участка-источника" }
    }

    revalidatePath("/")
    revalidatePath("/admin")
    revalidatePath("/catalog")

    return { success: true }
  } catch (error) {
    console.error("Error merging plots:", error)
    return { success: false, error: "Неизвестная ошибка при объединении" }
  }
}

export async function getLandPlotById(id: string): Promise<LandPlot | null> {
  const supabase = createAdminClient()

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    let query = supabase.from("land_plots").select("*")

    if (isUuid) {
      query = query.eq("id", id)
    } else {
      const intId = parseInt(id, 10)
      if (!isNaN(intId)) {
        query = query.eq("int_id", intId)
      } else {
        return null
      }
    }

    const { data, error } = await query.single()

    if (error) {
      console.error("[v0] Error fetching land plot:", error)
      return null
    }

    return data as LandPlot
  } catch (error) {
    console.error("[v0] Error in getLandPlotById:", error)
    return null
  }
}

// ============ SUBSCRIBERS ============

export async function createSubscriber(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("subscribers").insert({ email })

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Этот email уже подписан" }
    }
    console.error("Error creating subscriber:", error)
    return { success: false, error: "Ошибка подписки" }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function createViewingLead(data: {
  plot: {
    id: string
    location: string | null
    cadastral_number: string | null
    price: number | null
    area_sotok: number | null
  }
  phone: string
  name?: string
  messenger_whatsapp?: boolean
  messenger_telegram?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("leads").insert({
    name: data.name?.trim() || "Без имени",
    phone: data.phone,
    wishes: null,
    lead_type: "viewing",
    plot_id: data.plot.id,
    plot_location: data.plot.location,
    plot_cadastral_number: data.plot.cadastral_number,
    plot_price: data.plot.price,
    plot_area_sotok: data.plot.area_sotok,
    messenger_whatsapp: !!data.messenger_whatsapp,
    messenger_telegram: !!data.messenger_telegram,
    status: "new",
  })

  if (error) {
    console.error("Error creating viewing lead:", error)
    return { success: false, error: "Ошибка отправки заявки" }
  }

  // Telegram уведомление с информацией о мессенджерах
  const cleanPhone = data.phone.replace(/\D/g, '')
  const messengers: string[] = []
  if (data.messenger_telegram) messengers.push('Telegram')
  if (data.messenger_whatsapp) messengers.push('WhatsApp')

  const priceFormatted = data.plot.price ? `${(data.plot.price / 1000000).toFixed(1)} млн ₽` : 'не указана'
  const areaFormatted = data.plot.area_sotok ? `${data.plot.area_sotok} сот.` : ''

  let message = `🔔 <b>Новая заявка на просмотр!</b>

👤 <b>Имя:</b> ${data.name || 'Без имени'}
📞 <b>Телефон:</b> ${data.phone}`

  if (messengers.length > 0) {
    message += `\n💬 <b>Мессенджеры:</b> ${messengers.join(', ')}`
  }

  // Формируем кликабельную ссылку на кадастровую карту
  const cadastralLink = data.plot.cadastral_number
    ? `<a href="https://nspd.gov.ru/map?thematic=PKK&query=${encodeURIComponent(data.plot.cadastral_number)}">${data.plot.cadastral_number}</a>`
    : '—'

  message += `

🏞 <b>Участок:</b> ${data.plot.location || 'Не указан'}
📍 <b>Кадастр:</b> ${cadastralLink}
💰 <b>Цена:</b> ${priceFormatted} ${areaFormatted ? `(${areaFormatted})` : ''}

📲 <b>Быстрая связь:</b>
• <a href="https://wa.me/${cleanPhone}">WhatsApp</a>
• <a href="tel:${data.phone}">Позвонить</a>
• <a href="https://max.ru/im?phone=${cleanPhone}">MAX</a>`

  // Inline-кнопки для быстрых действий
  const buttons = [
    [
      { text: '📋 КП по участку', callback_data: `kp:${data.plot.id}` },
      { text: '🏘 Все в посёлке', callback_data: `location:${data.plot.location || ''}` },
    ],
    [
      { text: '✅ Обработано', callback_data: `done:${data.plot.id}` },
    ]
  ]

  await sendMessageWithButtons(message, buttons, 'viewing')

  revalidatePath("/admin")
  return { success: true }
}

// ============ LANDING BENEFITS (HOMEPAGE BLOCK) ============

const LANDING_BENEFITS_SECTION_ID = "00000000-0000-0000-0000-000000000002"

export async function getLandingBenefits(): Promise<{
  section: LandingBenefitsSection | null
  items: LandingBenefitItem[]
}> {
  const supabase = createAdminClient()

  const [{ data: section, error: sectionError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("landing_benefits_section").select("*").eq("id", LANDING_BENEFITS_SECTION_ID).single(),
    supabase
      .from("landing_benefit_items")
      .select("*")
      .eq("section_id", LANDING_BENEFITS_SECTION_ID)
      .order("sort_order", { ascending: true }),
  ])

  if (sectionError) {
    console.error("Error fetching landing benefits section:", sectionError)
  }
  if (itemsError) {
    console.error("Error fetching landing benefit items:", itemsError)
  }

  return {
    section: (section as LandingBenefitsSection) || null,
    items: (items as LandingBenefitItem[]) || [],
  }
}

export async function updateLandingBenefits(input: {
  section: Partial<LandingBenefitsSection>
  items: Array<Partial<LandingBenefitItem> & { id?: string }>
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { section, items } = input

  const { error: sectionError } = await supabase
    .from("landing_benefits_section")
    .update({
      ...section,
      updated_at: new Date().toISOString(),
    })
    .eq("id", LANDING_BENEFITS_SECTION_ID)

  if (sectionError) {
    console.error("Error updating landing benefits section:", sectionError)
    return { success: false, error: "Ошибка обновления секции" }
  }

  const payload = items.map((it, idx) => {
    const id = it.id || crypto.randomUUID()
    return {
      id,
      section_id: LANDING_BENEFITS_SECTION_ID,
      title: it.title ?? "",
      description: it.description ?? "",
      icon_type: it.icon_type ?? "lucide",
      icon_name: it.icon_name ?? null,
      icon_url: it.icon_url ?? null,
      color_class: it.color_class ?? "bg-primary/10 text-primary",
      sort_order: it.sort_order ?? idx + 1,
      is_active: it.is_active ?? true,
      updated_at: new Date().toISOString(),
    }
  })

  const { error: upsertError } = await supabase
    .from("landing_benefit_items")
    .upsert(payload, { onConflict: "id" })

  if (upsertError) {
    console.error("Error upserting landing benefit items:", upsertError)
    return { success: false, error: "Ошибка сохранения карточек" }
  }

  revalidatePath("/admin")
  revalidatePath("/")

  return { success: true }
}

export async function getSubscribers(): Promise<Subscriber[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("subscribers").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching subscribers:", error)
    return []
  }

  return data as Subscriber[]
}

export async function deleteSubscriber(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("subscribers").delete().eq("id", id)

  if (error) {
    console.error("Error deleting subscriber:", error)
    throw new Error(error.message)
  }

  revalidatePath("/admin")
}

export async function updateSubscriber(id: string, is_active: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("subscribers").update({ is_active }).eq("id", id)

  if (error) {
    console.error("Error updating subscriber:", error)
    return { success: false, error: "Ошибка обновления подписчика" }
  }

  revalidatePath("/admin")
  return { success: true }
}

// ============ LEADS ============

export async function createLead(data: {
  name: string;
  phone: string;
  wishes?: string;
  lead_type?: "general" | "faq";
}): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("leads").insert({
    name: data.name,
    phone: data.phone,
    wishes: data.wishes || null,
    lead_type: data.lead_type || "general",
    status: "new",
  })

  if (error) {
    console.error("Error creating lead:", error)
    return { success: false, error: "Ошибка отправки заявки" }
  }

  // Telegram уведомление
  const typeText = data.lead_type === "faq" ? "Вопрос из FAQ" : "Новая заявка"
  await sendMessageToAdmin(`🔔 <b>${typeText}!</b>

👤 <b>Имя:</b> ${data.name}
📞 <b>Телефон:</b> ${data.phone}${data.wishes ? `\n💬 ${data.lead_type === 'faq' ? 'Вопрос' : 'Пожелания'}: ${data.wishes}` : ''}`, data.lead_type === 'faq' ? 'faq' : 'leads')

  revalidatePath("/admin")
  return { success: true }
}

export async function getLeads(): Promise<Lead[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leads:", error)
    return []
  }

  return data as Lead[]
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead | null> {
  const supabase = createAdminClient()

  const { data: lead, error } = await supabase
    .from("leads")
    .update({
      wishes: data.wishes,
      status: data.status,
      manager_comment: data.manager_comment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating lead:", error)
    throw new Error(error.message)
  }

  revalidatePath("/admin")
  return lead as Lead
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("leads").delete().eq("id", id)

  if (error) {
    console.error("Error deleting lead:", error)
    throw new Error(error.message)
  }

  revalidatePath("/admin")
}

// ============ USERS ============

export async function getUsers(): Promise<User[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, role, is_active, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    return []
  }

  const users = (data as User[]) ?? []

  const emails = users.map((u) => u.email).filter(Boolean)
  if (emails.length === 0) return users

  const { data: adminUsers, error: adminUsersError } = await supabase
    .from("admin_users")
    .select("email, username")
    .in("email", emails)

  if (adminUsersError) {
    console.error("Error fetching admin_users by email:", adminUsersError)
    return users
  }

  const usernameByEmail = new Map<string, string>()
    ; (adminUsers || []).forEach((au: any) => {
      if (au?.email && au?.username) usernameByEmail.set(au.email, au.username)
    })

  return users.map((u) => ({ ...u, username: usernameByEmail.get(u.email) }))
}

export async function createUser(data: {
  username: string
  email: string
  password: string
  name: string
  role: string
}): Promise<{
  success: boolean
  error?: string
}> {
  if (!data.username || !data.username.trim()) {
    return { success: false, error: "Имя пользователя обязательно" }
  }
  if (!data.email || !data.email.trim()) {
    return { success: false, error: "Email обязателен" }
  }
  if (!data.name || !data.name.trim()) {
    return { success: false, error: "Имя обязательно" }
  }
  if (!data.password || !data.password.trim()) {
    return { success: false, error: "Пароль обязателен" }
  }

  const supabase = createAdminClient()

  // Simple hash for demo - in production use bcrypt
  const password_hash = btoa(data.password + "_salt_baltikzemlya")

  const { error } = await supabase.from("users").insert({
    email: data.email.trim(),
    password_hash,
    name: data.name.trim(),
    role: data.role,
    is_active: true,
  })

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Пользователь с таким email уже существует" }
    }
    console.error("Error creating user:", error)
    return { success: false, error: "Ошибка создания пользователя" }
  }

  const adminPasswordHash = await bcrypt.hash(data.password.trim(), 10)
  const { error: adminInsertError } = await supabase.from("admin_users").insert({
    username: data.username.trim(),
    password_hash: adminPasswordHash,
    email: data.email.trim(),
    name: data.name.trim(),
    is_active: true,
  })

  if (adminInsertError) {
    if (adminInsertError.code === "23505") {
      return { success: false, error: "Пользователь с таким именем уже существует" }
    }
    console.error("Error creating admin user:", adminInsertError)
    return { success: false, error: "Ошибка создания пользователя" }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function updateUser(
  id: string,
  data: Partial<User> & { password?: string; prevUsername?: string },
): Promise<User | null> {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    role: data.role,
    is_active: data.is_active,
    updated_at: new Date().toISOString(),
  }

  if (data.password) {
    updateData.password_hash = btoa(data.password + "_salt_baltikzemlya")
  }

  const { data: user, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", id)
    .select("id, email, name, role, is_active, created_at, updated_at")
    .single()

  if (error) {
    console.error("Error updating user:", error)
    throw new Error(error.message)
  }

  revalidatePath("/admin")
  const updatedUser = user as User

  if (data.username) {
    const targetUsername = data.username.trim()
    const prevUsername = String(data.prevUsername || "").trim()
    const adminUpdateData: Record<string, unknown> = {
      username: targetUsername,
      email: updatedUser.email,
      name: updatedUser.name,
      is_active: updatedUser.is_active,
      updated_at: new Date().toISOString(),
    }
    if (data.password) {
      adminUpdateData.password_hash = await bcrypt.hash(data.password.trim(), 10)
    }

    const { data: updatedByEmail, error: updateByEmailError } = await supabase
      .from("admin_users")
      .update(adminUpdateData)
      .eq("email", updatedUser.email)
      .select("id")

    if (updateByEmailError) {
      if (updateByEmailError.code === "23505") {
        throw new Error("Пользователь с таким именем уже существует")
      }
      console.error("Error updating admin user by email:", updateByEmailError)
    }

    if (!updatedByEmail || updatedByEmail.length === 0) {
      const matchUsername = prevUsername || targetUsername
      const { data: updatedByUsername, error: updateByUsernameError } = await supabase
        .from("admin_users")
        .update(adminUpdateData)
        .eq("username", matchUsername)
        .select("id")

      if (updateByUsernameError) {
        if (updateByUsernameError.code === "23505") {
          throw new Error("Пользователь с таким именем уже существует")
        }
        console.error("Error updating admin user by username:", updateByUsernameError)
      }

      if (!updatedByUsername || updatedByUsername.length === 0) {
        const { error: adminInsertError } = await supabase.from("admin_users").insert(adminUpdateData)

        if (adminInsertError) {
          if (adminInsertError.code === "23505") {
            const { error: secondUpdateError } = await supabase
              .from("admin_users")
              .update(adminUpdateData)
              .eq("username", matchUsername)

            if (secondUpdateError) {
              console.error("Error updating existing admin user by username after conflict:", secondUpdateError)
              throw new Error("Пользователь с таким именем уже существует")
            }
          } else {
            console.error("Error creating admin user:", adminInsertError)
          }
        }
      }
    }
  }

  return { ...updatedUser, username: data.username || updatedUser.username }
}

export async function deleteUser(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("users").delete().eq("id", id)

  if (error) {
    console.error("Error deleting user:", error)
    throw new Error(error.message)
  }

  revalidatePath("/admin")
}

// ============ STATS ============

export async function getAdminStats(): Promise<{
  totalPlots: number
  activePlots: number
  featuredPlots: number
  totalArea: number
  newLeadsToday: number
  newLeadsWeek: number
  totalLeads: number
  totalSubscribers: number
  avgPricePerSotka: number
  totalValue: number
}> {
  const supabase = createAdminClient()

  const [plotsRes, leadsRes, subscribersRes] = await Promise.all([
    supabase.from("land_plots").select("price, area_sotok, is_active, is_featured"),
    supabase.from("leads").select("created_at"),
    supabase.from("subscribers").select("id"),
  ])

  const plots = plotsRes.data || []
  const leads = leadsRes.data || []
  const subscribers = subscribersRes.data || []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const activePlots = plots.filter((p) => p.is_active)
  const totalValue = activePlots.reduce((sum, p) => sum + p.price, 0)
  const totalArea = activePlots.reduce((sum, p) => sum + p.area_sotok, 0)

  return {
    totalPlots: plots.length,
    activePlots: activePlots.length,
    featuredPlots: plots.filter((p) => p.is_featured).length,
    totalArea: Math.round(totalArea),
    newLeadsToday: leads.filter((l) => new Date(l.created_at) >= today).length,
    newLeadsWeek: leads.filter((l) => new Date(l.created_at) >= weekAgo).length,
    totalLeads: leads.length,
    totalSubscribers: subscribers.length,
    avgPricePerSotka: totalArea > 0 ? Math.round(totalValue / totalArea) : 0,
    totalValue,
  }
}

// ============ NEWS ============

export async function getNews(publishedOnly = false): Promise<News[]> {
  const supabase = createAdminClient()

  let query = supabase.from("news").select("*").order("published_at", { ascending: false })

  if (publishedOnly) {
    query = query.eq("is_published", true)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching news:", error)
    return []
  }

  return data as News[]
}

export async function createNews(data: { title: string; content: string; image_url?: string }): Promise<News | null> {
  const supabase = createAdminClient()

  const { data: news, error } = await supabase
    .from("news")
    .insert({
      title: data.title,
      content: data.content,
      image_url: data.image_url || null,
      is_published: false,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating news:", error)
    throw new Error(error.message)
  }

  revalidatePath("/")
  revalidatePath("/admin")

  return news as News
}

export async function updateNews(
  id: string,
  data: { title?: string; content?: string; image_url?: string; is_published?: boolean },
): Promise<News | null> {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  // If publishing for the first time, set published_at
  if (data.is_published) {
    updateData.published_at = new Date().toISOString()
  }

  const { data: news, error } = await supabase.from("news").update(updateData).eq("id", id).select().single()

  if (error) {
    console.error("Error updating news:", error)
    throw new Error(error.message)
  }

  revalidatePath("/")
  revalidatePath("/admin")

  return news as News
}

export async function deleteNews(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("news").delete().eq("id", id)

  if (error) {
    console.error("Error deleting news:", error)
    throw new Error(error.message)
  }

  revalidatePath("/")
  revalidatePath("/admin")
}

// ============ COMMERCIAL PROPOSALS ============

export async function createProposal(data: {
  lead_id: string
  title: string
  description?: string
  plot_ids: string[]
}): Promise<{ success: boolean; proposal?: CommercialProposal; error?: string }> {
  try {
    const supabase = createAdminClient()

    // Create proposal
    const { data: proposal, error: proposalError } = await supabase
      .from("commercial_proposals")
      .insert({
        lead_id: data.lead_id,
        title: data.title,
        description: data.description || null,
        status: "draft",
      })
      .select()
      .single()

    if (proposalError) {
      console.error("Error creating proposal:", proposalError)
      return { success: false, error: "Ошибка создания КП" }
    }

    // Add plots to proposal
    if (data.plot_ids.length > 0) {
      const proposalPlots = data.plot_ids.map((plot_id, index) => ({
        proposal_id: proposal.id,
        plot_id,
        sort_order: index,
      }))

      const { data: insertedPlots, error: plotsError } = await supabase
        .from("commercial_proposal_plots")
        .insert(proposalPlots)
        .select()

      if (plotsError) {
        console.error("Error adding plots to proposal:", plotsError)
        // Rollback - delete the proposal
        await supabase.from("commercial_proposals").delete().eq("id", proposal.id)
        return { success: false, error: "Ошибка добавления участков в КП" }
      }
    }

    revalidatePath("/admin")
    return { success: true, proposal: proposal as CommercialProposal }
  } catch (error) {
    console.error("Error in createProposal:", error)
    return { success: false, error: String(error) }
  }
}

export async function getProposalsByLead(lead_id: string): Promise<CommercialProposalWithDetails[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("commercial_proposals")
    .select(
      `
      *,
      commercial_proposal_plots (
        *,
        plot:land_plots (*)
      )
    `,
    )
    .eq("lead_id", lead_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching proposals:", error)
    return []
  }

  return data as CommercialProposalWithDetails[]
}

export async function getProposalById(id: string): Promise<CommercialProposalWithDetails | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("commercial_proposals")
    .select(
      `
      *,
      lead:leads (*),
      commercial_proposal_plots (
        *,
        plot:land_plots (*)
      )
    `,
    )
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching proposal:", error)
    return null
  }

  return data as CommercialProposalWithDetails
}

export async function updateProposal(
  id: string,
  data: Partial<CommercialProposal>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("commercial_proposals")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("Error updating proposal:", error)
    return { success: false, error: "Ошибка обновления КП" }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function deleteProposal(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("commercial_proposals").delete().eq("id", id)

  if (error) {
    console.error("Error deleting proposal:", error)
    return { success: false, error: "Ошибка удаления КП" }
  }

  revalidatePath("/admin")
  return { success: true }
}

// ============ ADMIN AUTHENTICATION ============

export async function loginAdmin(
  username: string,
  password: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  const supabase = createAdminClient()

  const { data: adminUser, error } = await supabase.from("admin_users").select("*").eq("username", username).single()

  if (error || !adminUser) {
    return { success: false, error: "Неверный логин или пароль" }
  }

  const isValid = await bcrypt.compare(password, adminUser.password_hash)

  if (!isValid) {
    return { success: false, error: "Неверный логин или пароль" }
  }

  const sessionToken = btoa(JSON.stringify({ id: adminUser.id, username: adminUser.username, timestamp: Date.now() }))

  return { success: true, token: sessionToken }
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSessionCookie()
}

export async function checkAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")
  return !!session
}

export async function resetAdminPassword(): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const supabase = createAdminClient()

    const correctHash = await bcrypt.hash("123", 10)

    const { error } = await supabase.from("admin_users").update({ password_hash: correctHash }).eq("username", "admin")

    if (error) {
      console.error("[v0] Error updating password:", error)
      return { success: false, error: error.message }
    }

    return { success: true, hash: correctHash }
  } catch (error) {
    console.error("[v0] Error resetting password:", error)
    return { success: false, error: String(error) }
  }
}

// ============ LAND PLOTS FETCHING ============

export async function getLandPlots(): Promise<LandPlot[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("land_plots")
      .select("*, social_posts(platform, external_url, published_at)")
      .eq("is_active", true)
      .order("district", { ascending: true })
      .order("price", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching land plots:", error)
      return []
    }

    return (data || []).map((plot: any) => {
      // Find VK post if exists
      const vkPost = Array.isArray(plot.social_posts)
        ? plot.social_posts.find((p: any) => p.platform === 'vk')
        : null

      const { social_posts, ...rest } = plot

      return {
        ...rest,
        vk_post: vkPost ? {
          url: vkPost.external_url,
          published_at: vkPost.published_at
        } : null
      }
    }) as LandPlot[]
  } catch (err) {
    console.error("[v0] Exception fetching land plots:", err)
    return []
  }
}

export async function getAdminLandPlots(): Promise<LandPlot[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("land_plots")
      .select("*, social_posts(platform, external_url, published_at)")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching admin land plots:", error)
      return []
    }

    return (data || []).map((plot: any) => {
      // Find VK post if exists
      const vkPost = Array.isArray(plot.social_posts)
        ? plot.social_posts.find((p: any) => p.platform === 'vk')
        : null

      const { social_posts, ...rest } = plot

      return {
        ...rest,
        vk_post: vkPost ? {
          url: vkPost.external_url,
          published_at: vkPost.published_at
        } : null
      }
    }) as LandPlot[]
  } catch (err) {
    console.error("[v0] Exception fetching admin land plots:", err)
    return []
  }
}

// ============ ORGANIZATION SETTINGS ============

export async function getOrganizationSettings(): Promise<OrganizationSettings | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .single()

  if (error) {
    console.error("Error fetching organization settings:", error)
    return null
  }

  return data as OrganizationSettings
}

export async function updateOrganizationSettings(
  data: Partial<OrganizationSettings>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("organization_settings")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "00000000-0000-0000-0000-000000000001")

  if (error) {
    console.error("Error updating organization settings:", error)
    return { success: false, error: "Ошибка обновления настроек" }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return { success: true }
}

// ============ ALL PROPOSALS FOR MULTIPLE LEADS ============

export async function getAllProposalsForLeads(
  lead_ids: string[],
): Promise<Record<string, CommercialProposalWithDetails[]>> {
  if (lead_ids.length === 0) return {}

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("commercial_proposals")
    .select(
      `
      *,
      commercial_proposal_plots (
        *,
        plot:land_plots (*)
      )
    `,
    )
    .in("lead_id", lead_ids)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching proposals:", error)
    return {}
  }

  // Group by lead_id
  const proposalsByLead: Record<string, CommercialProposalWithDetails[]> = {}
  for (const proposal of data as CommercialProposalWithDetails[]) {
    if (!proposalsByLead[proposal.lead_id]) {
      proposalsByLead[proposal.lead_id] = []
    }
    proposalsByLead[proposal.lead_id].push(proposal)
  }

  return proposalsByLead
}

// ============ LAND PLOT IMPORT/EXPORT ============

export async function syncLandPlotsFromData(
  landPlotsData: LandPlotData[],
  settlement: string,
  replaceAll = false,
  logData?: { fileName: string; fileType: string },
  autoResolve = false,
  skipLogging = false,
  onProgress?: (event: {
    type: "detail" | "batch" | "summary";
    processed?: number;
    total?: number;
    detail?: SyncDetail;
    summary?: Pick<SyncResult, "added" | "updated" | "deleted" | "errors" | "message" | "success">;
  }) => void,
): Promise<SyncResult> {
  const isMultiSettlement = settlement === "__MULTI__"
  console.log(
    `[v0] Starting sync for ${landPlotsData.length} plots. Mode: ${replaceAll ? "REPLACE ALL" : (isMultiSettlement ? "MULTI-SETTLEMENT" : `Settlement: ${settlement}`)}`,
  )

  const supabase = createAdminClient()
  const results: SyncResult = {
    success: true,
    message: "",
    added: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    details: [],
  }

  const isMissingColumnError = (err: any, column: string) => {
    const msg = String(err?.message || "")
    return err?.code === "PGRST204" && msg.includes(`'${column}'`) && msg.includes("schema cache")
  }

  const isUuid = (value: unknown) => {
    if (typeof value !== "string") return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  }

  const stableUuidFromString = (input: string) => {
    const hex = createHash("md5").update(input).digest("hex")
    const arr = hex.split("")
    // UUID v4-ish: set version(4) and variant(8..b)
    arr[12] = "4"
    arr[16] = (parseInt(arr[16], 16) & 0x3 | 0x8).toString(16)
    const h = arr.join("")
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
  }

  const bundleIdMap = new Map<string, string>()

  const normalizeBundleId = (bundleId: unknown) => {
    if (bundleId === null || bundleId === undefined) return null
    const raw = String(bundleId).trim()
    if (!raw) return null
    if (isUuid(raw)) return raw
    const prev = bundleIdMap.get(raw)
    if (prev) return prev
    const next = stableUuidFromString(raw)
    bundleIdMap.set(raw, next)
    return next
  }

  if (replaceAll) {
    console.log(`[v0] REPLACE ALL mode requested but disabled: using matching + archive mode instead`)
  }

  const cadastralNumbers = new Set<string>()
  const duplicates = new Set<string>()

  for (const plotData of landPlotsData) {
    if (!plotData.cadastral_number) {
      continue
    }
    if (cadastralNumbers.has(plotData.cadastral_number)) {
      duplicates.add(plotData.cadastral_number)
      results.errors.push(`Дубликат кадастрового номера в файле: ${plotData.cadastral_number}`)
    }
    cadastralNumbers.add(plotData.cadastral_number)
  }

  const BATCH_SIZE = 10
  const batches = []
  for (let i = 0; i < landPlotsData.length; i += BATCH_SIZE) {
    batches.push(landPlotsData.slice(i, i + BATCH_SIZE))
  }

  const ensurePlotHasPlaceholderCover = async (plotId: string) => {
    const { data: plotRow, error: plotError } = await supabase
      .from("land_plots")
      .select("id, image_url")
      .eq("id", plotId)
      .maybeSingle()

    if (plotError || !plotRow || plotRow.image_url) return

    const { data: placeholders, error: placeholdersError } = await supabase
      .from("plot_placeholders")
      .select("id, storage_path, public_url")

    if (placeholdersError || !placeholders || placeholders.length === 0) return

    const picked = placeholders[Math.floor(Math.random() * placeholders.length)]

    const { error: updatePlotError } = await supabase
      .from("land_plots")
      .update({ image_url: picked.public_url, updated_at: new Date().toISOString() })
      .eq("id", plotId)

    if (updatePlotError) return

    const { count } = await supabase
      .from("land_plot_images")
      .select("id", { count: "exact", head: true })
      .eq("plot_id", plotId)

    if ((count || 0) === 0) {
      await supabase.from("land_plot_images").insert({
        plot_id: plotId,
        storage_path: picked.storage_path,
        public_url: picked.public_url,
        is_cover: true,
      })
    }
  }

  console.log(`[v0] Processing ${batches.length} batches of ${BATCH_SIZE} plots each`)

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    console.log(`[v0] Processing batch ${batchIndex + 1}/${batches.length}`)

    onProgress?.({
      type: "batch",
      processed: batchIndex * BATCH_SIZE,
      total: landPlotsData.length,
    })

    for (let i = 0; i < batch.length; i++) {
      const plotData = batch[i]
      const globalIndex = batchIndex * BATCH_SIZE + i + 1

      console.log(
        `[v0] Processing plot ${globalIndex}/${landPlotsData.length}: ${plotData.cadastral_number} - ${plotData.location}`,
      )

      if (!plotData.cadastral_number) {
        results.errors.push(`Строка ${globalIndex}: Отсутствует кадастровый номер`)
        const detail: SyncDetail = {
          line: globalIndex,
          status: "error",
          message: "Отсутствует кадастровый номер",
          cadastral: "",
        }
        results.details.push(detail)
        onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
        continue
      }

      if (duplicates.has(plotData.cadastral_number)) {
        console.log(`[v0] Skipping duplicate cadastral number: ${plotData.cadastral_number}`)
        const detail: SyncDetail = {
          line: globalIndex,
          status: "skipped",
          message: `Пропущен (дубликат): ${plotData.location} (${plotData.cadastral_number})`,
          cadastral: plotData.cadastral_number,
        }
        results.details.push(detail)
        onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
        continue
      }

      try {
        if (replaceAll) {
          console.log(`[v0] REPLACE ALL mode: Adding new plot: ${plotData.cadastral_number}`)

          let finalDistrict = plotData.district
          let finalLocation = plotData.location
          let autoResolutionError = ""

          if (autoResolve) {
            const resolution = await resolveLocationByCadastral(plotData.cadastral_number)
            if (!resolution.error) {
              // Only overwrite if resolution succeeded
              if (resolution.district) plotData.district = resolution.district
              if (resolution.location) plotData.location = resolution.location
              if (resolution.land_status && (!plotData.land_status || plotData.land_status === "")) {
                plotData.land_status = resolution.land_status
              }
            }
          }

          const normalizedBundleId = normalizeBundleId(plotData.bundle_id)

          const insertPayload: any = {
            title: plotData.title,
            district: finalDistrict,
            location: finalLocation,
            cadastral_number: plotData.cadastral_number,
            area_sotok: plotData.area_sotok,
            price: plotData.price,
            description: plotData.description,
            land_status: plotData.land_status,
            ownership_type: plotData.ownership_type ?? null,
            lease_from: plotData.lease_from ?? null,
            lease_to: plotData.lease_to ?? null,
            vri_id: plotData.vri_id ?? null,
            is_reserved: plotData.is_reserved ?? false,
            bundle_id: normalizedBundleId,
            bundle_title: plotData.bundle_title ?? null,
            is_bundle_primary: plotData.is_bundle_primary ?? false,
            coordinates_json: plotData.coordinates_json ?? null,
            has_coordinates: plotData.has_coordinates ?? false,
            center_lat: plotData.center_lat ?? null,
            center_lon: plotData.center_lon ?? null,
            sync_error: plotData.sync_error ?? null,
            has_gas: plotData.has_gas ?? false,
            has_electricity: plotData.has_electricity ?? false,
            has_water: plotData.has_water ?? false,
            has_installment: plotData.has_installment ?? false,
            is_active: true,
          }

          let insertedPlot: any = null
          let insertError: any = null

            ; ({ data: insertedPlot, error: insertError } = await supabase
              .from("land_plots")
              .insert(insertPayload)
              .select("id")
              .single())

          if (insertError && isMissingColumnError(insertError, "bundle_title")) {
            delete insertPayload.bundle_title
              ; ({ data: insertedPlot, error: insertError } = await supabase
                .from("land_plots")
                .insert(insertPayload)
                .select("id")
                .single())
          }

          if (insertError) {
            console.error(`[v0] Error adding plot:`, insertError)
            results.errors.push(`Строка ${globalIndex}: Ошибка добавления - ${insertError.message}`)
            const detail: SyncDetail = {
              line: globalIndex,
              status: "error",
              message: `Ошибка: ${insertError.message}`,
              cadastral: plotData.cadastral_number,
            }
            results.details.push(detail)
            onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
          } else {
            console.log(`[v0] Successfully added plot ${plotData.cadastral_number}`)
            results.added++
            if (insertedPlot?.id) {
              await ensurePlotHasPlaceholderCover(insertedPlot.id)
            }
            const detail: SyncDetail = {
              line: globalIndex,
              status: "added",
              message: `Добавлен: ${plotData.location} (${plotData.cadastral_number})`,
              cadastral: plotData.cadastral_number,
            }
            results.details.push(detail)
            onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
            // Sync coordinates:
            // 1) skip if coordinates came from import file
            // 2) else NSPD
            const hasExternalCoords =
              plotData.has_coordinates === true ||
              (!!plotData.coordinates_json && plotData.coordinates_json !== null) ||
              (typeof plotData.center_lat === "number" && typeof plotData.center_lon === "number")
            if (insertedPlot?.id && !hasExternalCoords) {
              const applied = await applyLocalCoordsFromFile(insertedPlot.id, plotData.cadastral_number)
              if (applied === "none" || applied === "center") {
                syncPlotCoordinates(insertedPlot.id, plotData.cadastral_number).catch(console.error)
              }
            }
          }
        } else {
          // Original logic for settlement-specific sync
          const { data: existingPlots, error: checkError } = await supabase
            .from("land_plots")
            .select("id, image_url")
            .eq("cadastral_number", plotData.cadastral_number)
            .limit(1)

          if (checkError) {
            console.error(`[v0] Error checking existing plot:`, checkError)
            results.errors.push(`Строка ${globalIndex}: Ошибка проверки - ${checkError.message}`)
            results.details.push({
              line: globalIndex,
              status: "error",
              message: `Ошибка: ${checkError.message}`,
              cadastral: plotData.cadastral_number,
            })
            continue
          }

          if (existingPlots && existingPlots.length > 0) {
            console.log(`[v0] Updating existing plot: ${existingPlots[0].id}`)

            let finalDistrict = plotData.district
            let finalLocation = plotData.location

            if (autoResolve) {
              const resolution = await resolveLocationByCadastral(plotData.cadastral_number)
              if (!resolution.error) {
                if (resolution.district) finalDistrict = resolution.district
                if (resolution.location) finalLocation = resolution.location
                if (resolution.land_status && (!plotData.land_status || plotData.land_status === "")) {
                  plotData.land_status = resolution.land_status
                }
              }
            }

            const normalizedBundleId = normalizeBundleId(plotData.bundle_id)

            let { error: updateError } = await supabase
              .from("land_plots")
              .update({
                title: plotData.title,
                district: finalDistrict,
                location: finalLocation,
                area_sotok: plotData.area_sotok,
                price: plotData.price,
                description: plotData.description,
                land_status: plotData.land_status,
                ownership_type: plotData.ownership_type ?? null,
                lease_from: plotData.lease_from ?? null,
                lease_to: plotData.lease_to ?? null,
                vri_id: plotData.vri_id ?? null,
                is_reserved: plotData.is_reserved ?? false,
                bundle_id: normalizedBundleId,
                bundle_title: plotData.bundle_title ?? null,
                is_bundle_primary: plotData.is_bundle_primary ?? false,
                coordinates_json: plotData.coordinates_json ?? undefined,
                has_coordinates: plotData.has_coordinates ?? undefined,
                center_lat: plotData.center_lat ?? undefined,
                center_lon: plotData.center_lon ?? undefined,
                sync_error: plotData.sync_error ?? undefined,
                has_gas: plotData.has_gas ?? false,
                has_electricity: plotData.has_electricity ?? false,
                has_water: plotData.has_water ?? false,
                has_installment: plotData.has_installment ?? false,
                is_active: true,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingPlots[0].id)

            if (updateError && isMissingColumnError(updateError, "bundle_title")) {
              const { error: retryUpdateError } = await supabase
                .from("land_plots")
                .update({
                  title: plotData.title,
                  district: finalDistrict,
                  location: finalLocation,
                  area_sotok: plotData.area_sotok,
                  price: plotData.price,
                  description: plotData.description,
                  is_active: true,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingPlots[0].id)
              updateError = retryUpdateError
            }

            if (updateError) {
              console.error(`[v0] Error updating plot:`, updateError)
              results.errors.push(`Строка ${globalIndex}: Ошибка обновления - ${updateError.message}`)
              const detail: SyncDetail = {
                line: globalIndex,
                status: "error",
                message: `Ошибка: ${updateError.message}`,
                cadastral: plotData.cadastral_number,
              }
              results.details.push(detail)
              onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
            } else {
              console.log(`[v0] Successfully updated plot ${existingPlots[0].id}`)
              results.updated++
              if (!existingPlots[0].image_url) {
                await ensurePlotHasPlaceholderCover(existingPlots[0].id)
              }
              const detail: SyncDetail = {
                line: globalIndex,
                status: "updated",
                message: `Обновлен: ${plotData.location} (${plotData.cadastral_number})`,
                cadastral: plotData.cadastral_number,
              }
              results.details.push(detail)
              onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
              // Sync coordinates
              {
                const hasExternalCoords =
                  plotData.has_coordinates === true ||
                  (!!plotData.coordinates_json && plotData.coordinates_json !== null) ||
                  (typeof plotData.center_lat === "number" && typeof plotData.center_lon === "number")
                if (!hasExternalCoords) {
                  const applied = await applyLocalCoordsFromFile(existingPlots[0].id, plotData.cadastral_number)
                  if (applied === "none" || applied === "center") {
                    syncPlotCoordinates(existingPlots[0].id, plotData.cadastral_number).catch(console.error)
                  }
                }
              }
            }
          } else {
            console.log(`[v0] Adding new plot: ${plotData.cadastral_number}`)

            let finalDistrict = plotData.district
            let finalLocation = plotData.location

            if (autoResolve) {
              const resolution = await resolveLocationByCadastral(plotData.cadastral_number)
              if (!resolution.error) {
                if (resolution.district) finalDistrict = resolution.district
                if (resolution.location) finalLocation = resolution.location
                if (resolution.land_status && (!plotData.land_status || plotData.land_status === "")) {
                  plotData.land_status = resolution.land_status
                }
              }
            }

            const normalizedBundleId = normalizeBundleId(plotData.bundle_id)

            const insertPayload: any = {
              title: plotData.title,
              district: finalDistrict,
              location: finalLocation,
              cadastral_number: plotData.cadastral_number,
              area_sotok: plotData.area_sotok,
              price: plotData.price,
              description: plotData.description,
              land_status: plotData.land_status,
              ownership_type: plotData.ownership_type ?? null,
              lease_from: plotData.lease_from ?? null,
              lease_to: plotData.lease_to ?? null,
              vri_id: plotData.vri_id ?? null,
              is_reserved: plotData.is_reserved ?? false,
              bundle_id: normalizedBundleId,
              bundle_title: plotData.bundle_title ?? null,
              is_bundle_primary: plotData.is_bundle_primary ?? false,
              coordinates_json: plotData.coordinates_json ?? null,
              has_coordinates: plotData.has_coordinates ?? false,
              center_lat: plotData.center_lat ?? null,
              center_lon: plotData.center_lon ?? null,
              sync_error: plotData.sync_error ?? null,
              has_gas: plotData.has_gas ?? false,
              has_electricity: plotData.has_electricity ?? false,
              has_water: plotData.has_water ?? false,
              has_installment: plotData.has_installment ?? false,
              is_active: true,
            }

            let insertedPlot: any = null
            let insertError: any = null

              ; ({ data: insertedPlot, error: insertError } = await supabase
                .from("land_plots")
                .insert(insertPayload)
                .select("id")
                .single())

            if (insertError && isMissingColumnError(insertError, "bundle_title")) {
              delete insertPayload.bundle_title
                ; ({ data: insertedPlot, error: insertError } = await supabase
                  .from("land_plots")
                  .insert(insertPayload)
                  .select("id")
                  .single())
            }

            if (insertError) {
              console.error(`[v0] Error adding plot:`, insertError)
              results.errors.push(`Строка ${globalIndex}: Ошибка добавления - ${insertError.message}`)
              const detail: SyncDetail = {
                line: globalIndex,
                status: "error",
                message: `Ошибка: ${insertError.message}`,
                cadastral: plotData.cadastral_number,
              }
              results.details.push(detail)
              onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
            } else {
              console.log(`[v0] Successfully added plot ${plotData.cadastral_number}`)
              results.added++
              if (insertedPlot?.id) {
                await ensurePlotHasPlaceholderCover(insertedPlot.id)
              }
              const detail: SyncDetail = {
                line: globalIndex,
                status: "added",
                message: `Добавлен: ${plotData.location} (${plotData.cadastral_number})`,
                cadastral: plotData.cadastral_number,
              }
              results.details.push(detail)
              onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
              // Sync coordinates
              {
                const hasExternalCoords =
                  plotData.has_coordinates === true ||
                  (!!plotData.coordinates_json && plotData.coordinates_json !== null) ||
                  (typeof plotData.center_lat === "number" && typeof plotData.center_lon === "number")
                if (insertedPlot?.id && !hasExternalCoords) {
                  const applied = await applyLocalCoordsFromFile(insertedPlot.id, plotData.cadastral_number)
                  if (applied === "none" || applied === "center") {
                    syncPlotCoordinates(insertedPlot.id, plotData.cadastral_number).catch(console.error)
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`[v0] Exception processing plot:`, error)
        results.errors.push(
          `Строка ${globalIndex}: Исключение - ${error instanceof Error ? error.message : String(error)}`,
        )
        const detail: SyncDetail = {
          line: globalIndex,
          status: "error",
          message: `Исключение: ${error instanceof Error ? error.message : String(error)}`,
          cadastral: plotData.cadastral_number,
        }
        results.details.push(detail)
        onProgress?.({ type: "detail", processed: globalIndex, total: landPlotsData.length, detail })
      }
    }

    if (batchIndex < batches.length - 1) {
      console.log(`[v0] Waiting 500ms before next batch...`)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  if (!replaceAll && settlement && !isMultiSettlement) {
    try {
      console.log(`[v0] Checking for plots to archive in ${settlement}`)

      const importedCadastralNumbers = Array.from(cadastralNumbers)

      const { data: existingPlots, error: fetchError } = await supabase
        .from("land_plots")
        .select("id, cadastral_number")
        .eq("location", settlement)
        .eq("is_active", true)

      if (fetchError) {
        console.error(`[v0] Error fetching existing plots:`, fetchError)
        results.errors.push(`Ошибка при поиске участков для архивирования: ${fetchError.message}`)
      } else if (existingPlots) {
        const plotsToArchive = existingPlots.filter((plot) => !importedCadastralNumbers.includes(plot.cadastral_number))

        console.log(`[v0] Found ${plotsToArchive.length} plots to archive in ${settlement}`)

        for (const plot of plotsToArchive) {
          const { error: archiveError } = await supabase
            .from("land_plots")
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", plot.id)

          if (archiveError) {
            console.error(`[v0] Error archiving plot:`, archiveError)
            results.errors.push(`Ошибка архивирования ${plot.cadastral_number}: ${archiveError.message}`)
          } else {
            console.log(`[v0] Archived plot: ${plot.cadastral_number}`)
            results.deleted++
            const detail: SyncDetail = {
              line: 0,
              status: "archived",
              message: `Архивирован (не найден в файле): ${plot.cadastral_number}`,
              cadastral: plot.cadastral_number,
            }
            results.details.push(detail)
            onProgress?.({ type: "detail", processed: landPlotsData.length, total: landPlotsData.length, detail })
          }
        }
      }
    } catch (error) {
      console.error(`[v0] Exception archiving plots:`, error)
      results.errors.push(`Исключение при архивировании: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (!skipLogging) {
    try {
      console.log(`[v0] Saving import log to database...`)

      const { error: logError } = await supabase.from("import_logs").insert({
        settlement: replaceAll ? "Полная база" : (isMultiSettlement ? "MULTI" : settlement),
        file_name: logData?.fileName || `${isMultiSettlement ? "MULTI" : settlement} import`,
        file_type: logData?.fileType || "PDF",
        added_count: results.added,
        updated_count: results.updated,
        archived_count: results.deleted,
        details: results.details.map((detail) => ({
          cadastral_number: detail.cadastral,
          operation: detail.status,
          settlement: isMultiSettlement ? "MULTI" : (settlement || "Unknown"),
          message: detail.message,
        })),
      })

      if (logError) {
        console.error(`[v0] Error saving import log:`, logError)
      } else {
        console.log(`[v0] Import log saved successfully`)
      }
    } catch (error) {
      console.error(`[v0] Exception saving import log:`, error)
    }
  }

  onProgress?.({
    type: "summary",
    processed: landPlotsData.length,
    total: landPlotsData.length,
    summary: {
      success: results.success,
      message: results.message,
      added: results.added,
      updated: results.updated,
      deleted: results.deleted,
      errors: results.errors,
    },
  })

  return results
}

export async function createImportLog(data: {
  settlement: string
  file_name: string
  file_type: string
  added_count: number
  updated_count: number
  archived_count: number
  details: any[]
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("import_logs").insert({
    settlement: data.settlement,
    file_name: data.file_name,
    file_type: data.file_type,
    added_count: data.added_count,
    updated_count: data.updated_count,
    archived_count: data.archived_count,
    details: data.details,
  })

  if (error) {
    console.error(`[createImportLog] Error:`, error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function exportLandPlotsToJSON(): Promise<{
  success: boolean
  data?: Array<Record<string, unknown>>
  error?: string
}> {
  const supabase = createAdminClient()

  const { data: plots, error } = await supabase
    .from("land_plots")
    .select("*")
    .order("district", { ascending: true })
    .order("location", { ascending: true })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    data: plots?.map((p) => ({
      "Населенный пункт": p.location,
      "Цена (₽)": p.price,
      "Площадь (сот.)": p.area_sotok,
      Район: p.district,
      "Статус земли": p.land_status,
      "Кадастровый номер": p.cadastral_number || "",
      "Форма владения": p.ownership_type || "ownership",
      Описание: p.description || "",
      Газ: p.has_gas ? "Да" : "Нет",
      Электричество: p.has_electricity ? "Да" : "Нет",
      Вода: p.has_water ? "Да" : "Нет",
      Рассрочка: p.has_installment ? "Да" : "Нет",
      Активен: p.is_active ? "Да" : "Нет",
      Избранный: p.is_featured ? "Да" : "Нет",
    })),
  }
}

export async function clearAllLandPlots(): Promise<{ success: boolean; message: string; deleted: number }> {
  const supabase = createAdminClient()

  try {
    const { count } = await supabase.from("land_plots").select("id", { count: "exact", head: true })

    const { error: deleteError } = await supabase.from("land_plots").delete().neq("id", "00000000-0000-0000-0000-000000000000") // Delete all

    if (deleteError) {
      return { success: false, message: `Ошибка удаления: ${deleteError.message}`, deleted: 0 }
    }

    const deleted = count || 0

    await supabase.from("import_logs").insert({
      settlement: "Все поселки",
      file_name: "Полная очистка базы",
      file_type: "CLEAR_ALL",
      added_count: 0,
      updated_count: 0,
      archived_count: deleted,
      details: [],
    })

    return { success: true, message: `Удалены все участки (${deleted} шт.)`, deleted }
  } catch (error) {
    return {
      success: false,
      message: `Исключение: ${error instanceof Error ? error.message : String(error)}`,
      deleted: 0,
    }
  }
}

export async function clearLandPlotsBySettlement(
  district: string,
  settlement: string,
): Promise<{ success: boolean; message: string; deleted: number }> {
  const supabase = createAdminClient()

  if (!settlement || settlement.trim().length === 0) {
    return { success: false, message: "Не указан населенный пункт", deleted: 0 }
  }

  try {
    const query = supabase.from("land_plots").select("id", { count: "exact", head: true }).eq("location", settlement)
    const scoped = district && district !== "all" ? query.eq("district", district) : query
    const { count } = await scoped

    const deleteQuery = supabase.from("land_plots").delete().eq("location", settlement)
    const deleteScoped = district && district !== "all" ? deleteQuery.eq("district", district) : deleteQuery
    const { error: deleteError } = await deleteScoped

    if (deleteError) {
      return { success: false, message: `Ошибка удаления: ${deleteError.message}`, deleted: 0 }
    }

    const deleted = count || 0

    await supabase.from("import_logs").insert({
      settlement,
      file_name: "Очистка поселка",
      file_type: "CLEAR",
      added_count: 0,
      updated_count: 0,
      archived_count: deleted,
      details: [],
    })

    return { success: true, message: `Удалено участков: ${deleted}`, deleted }
  } catch (error) {
    return {
      success: false,
      message: `Исключение: ${error instanceof Error ? error.message : String(error)}`,
      deleted: 0,
    }
  }
}

export async function getSettlementPlotCounts(): Promise<
  Array<{ district: string | null; settlement: string | null; count: number }>
> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("land_plots").select("district, location")

  if (error || !data) {
    console.error("[getSettlementPlotCounts] Error:", error)
    return []
  }

  const map = new Map<string, { district: string | null; settlement: string | null; count: number }>()

  for (const row of data as Array<{ district: string | null; location: string | null }>) {
    const settlement = row.location
    if (!settlement) continue
    const district = row.district
    const key = `${district || ""}||${settlement}`

    const prev = map.get(key)
    if (prev) {
      prev.count += 1
    } else {
      map.set(key, { district, settlement, count: 1 })
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const ad = (a.district || "").localeCompare(b.district || "", "ru")
    if (ad !== 0) return ad
    return (a.settlement || "").localeCompare(b.settlement || "", "ru")
  })
}

// ============ ADDRESS DATA (Districts, Settlements, Streets) ============
// Using KLADR tables: kladr_places and kladr_streets

export async function getDistricts() {
  const supabase = createAdminClient()

  console.log("[getDistricts] Fetching districts from kladr_places...")

  // Get unique districts from kladr_places where socr indicates district/region
  // In KLADR: районы обычно имеют socr = 'р-н' или подобное
  const { data, error } = await supabase
    .from("kladr_places")
    .select("code, name, socr")
    .or("socr.eq.р-н,socr.eq.г.о.,socr.eq.городской округ,socr.eq.район")
    .order("name", { ascending: true })

  if (error) {
    console.error("[getDistricts] Error fetching districts:", error)
    return []
  }

  console.log("[getDistricts] Fetched districts:", data)

  // Transform to match District interface
  return (data || []).map(d => {
    // Standardize to "Name район" format to match internal constants
    let name = d.name
    if (d.socr === "р-н" || d.socr === "район") {
      name = `${d.name} район`
    } else if (d.socr === "г.о." || d.socr === "городской округ") {
      name = `${d.name} район` // Simplify to match our import logic even if it's technically a GO
    } else {
      name = `${d.name} ${d.socr || ""}`.trim()
    }

    return {
      id: d.code,
      name: name,
      name_short: d.name,
      sort_order: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  })
}

export async function getSettlements(districtCode?: string) {
  const supabase = createAdminClient()

  console.log("[getSettlements] Fetching settlements from kladr_places...")

  // Get settlements (города, поселки) from kladr_places
  // Filter by district if provided
  let query = supabase
    .from("kladr_places")
    .select("code, name, socr")
    .or("socr.eq.г,socr.eq.п,socr.eq.пос,socr.eq.с,socr.eq.д")

  // If district code provided, filter by it (first 5 or 8 chars of code match)
  if (districtCode) {
    query = query.like("code", `${districtCode.substring(0, 5)}%`)
  }

  const { data, error } = await query.order("name", { ascending: true })

  if (error) {
    console.error("[getSettlements] Error fetching settlements:", error)
    return []
  }

  console.log("[getSettlements] Fetched settlements:", data)

  // Transform to match Settlement interface
  return (data || []).map(s => ({
    id: s.code,
    district_id: districtCode || '',
    name: `${s.socr ? s.socr + '. ' : ''}${s.name}`,
    settlement_type: s.socr,
    sort_order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
}

export async function getSettlementsByDistrictName(districtName: string) {
  const supabase = createAdminClient()

  console.log("[getSettlementsByDistrictName] Fetching for district:", districtName)

  // First, find the district code by name
  const { data: districtData, error: districtError } = await supabase
    .from("kladr_places")
    .select("code")
    .or("socr.eq.р-н,socr.eq.г.о.,socr.eq.городской округ,socr.eq.район")
    .ilike("name", `%${districtName.split(' ')[0]}%`)
    .limit(1)
    .single()

  if (districtError || !districtData) {
    console.error("[getSettlementsByDistrictName] District not found:", districtError)
    return []
  }

  const districtCode = districtData.code.substring(0, 5) // First 5 chars = district code
  console.log("[getSettlementsByDistrictName] District code:", districtCode)

  // Get settlements that belong to this district (code starts with district code)
  const { data, error } = await supabase
    .from("kladr_places")
    .select("code, name, socr")
    .or("socr.eq.г,socr.eq.п,socr.eq.пос,socr.eq.с,socr.eq.д")
    .like("code", `${districtCode}%`)
    .order("name", { ascending: true })

  if (error) {
    console.error("[getSettlementsByDistrictName] Error:", error)
    return []
  }

  console.log("[getSettlementsByDistrictName] Fetched settlements:", data?.length)

  // Transform to match Settlement interface
  return (data || []).map(s => {
    let rawPrefix = s.socr ? s.socr.toLowerCase() : ""
    let standardizedPrefix = ""

    // Standardize prefix to match KALININGRAD_SETTLEMENTS format
    if (rawPrefix === "п" || rawPrefix === "пос" || rawPrefix === "п." || rawPrefix === "пос.") {
      standardizedPrefix = "пос. "
    } else if (rawPrefix === "г" || rawPrefix === "г.") {
      standardizedPrefix = "г. "
    } else if (rawPrefix === "с" || rawPrefix === "с.") {
      standardizedPrefix = "с. "
    } else if (rawPrefix === "д" || rawPrefix === "д.") {
      standardizedPrefix = "д. "
    } else if (s.socr) {
      standardizedPrefix = s.socr + ". "
    }

    return {
      id: s.code,
      district_id: districtCode,
      name: `${standardizedPrefix}${s.name}`,
      settlement_type: s.socr,
      sort_order: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  })
}

export async function getAllSettlements() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("kladr_places")
    .select("code, name, socr")
    .or("socr.eq.г,socr.eq.п,socr.eq.пос,socr.eq.с,socr.eq.д")
    .order("name", { ascending: true })

  if (error) {
    console.error("[getAllSettlements] Error:", error)
    return []
  }

  return (data || []).map((s) => {
    let rawPrefix = s.socr ? s.socr.toLowerCase() : ""
    let standardizedPrefix = ""

    if (rawPrefix === "п" || rawPrefix === "пос" || rawPrefix === "п." || rawPrefix === "пос.") {
      standardizedPrefix = "пос. "
    } else if (rawPrefix === "г" || rawPrefix === "г.") {
      standardizedPrefix = "г. "
    } else if (rawPrefix === "с" || rawPrefix === "с.") {
      standardizedPrefix = "с. "
    } else if (rawPrefix === "д" || rawPrefix === "д.") {
      standardizedPrefix = "д. "
    } else if (s.socr) {
      standardizedPrefix = s.socr + ". "
    }

    const districtCode = String(s.code || "").substring(0, 5)

    return {
      id: s.code,
      district_id: districtCode,
      name: `${standardizedPrefix}${s.name}`,
      settlement_type: s.socr,
      sort_order: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })
}

export async function getStreets(settlementCode?: string) {
  const supabase = createAdminClient()

  console.log("[getStreets] Fetching streets from kladr_streets...")

  let query = supabase
    .from("kladr_streets")
    .select("code, name, socr, place_code")

  if (settlementCode) {
    query = query.eq("place_code", settlementCode)
  }

  const { data, error } = await query.order("name", { ascending: true })

  if (error) {
    console.error("[getStreets] Error fetching streets:", error)
    return []
  }

  console.log("[getStreets] Fetched streets:", data)

  // Transform to match Street interface
  return (data || []).map(s => ({
    id: s.code,
    settlement_id: s.place_code,
    name: `${s.socr ? s.socr + '. ' : ''}${s.name}`,
    street_type: s.socr,
    sort_order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
}

export async function getSettlementDescriptions(districtName?: string) {
  const supabase = createAdminClient()

  let query = supabase
    .from("settlement_descriptions")
    .select(
      "id, district_name, settlement_name, description, disclaimer, has_gas, has_electricity, has_water, has_installment, is_featured, created_at, updated_at",
    )
    .order("district_name", { ascending: true })
    .order("settlement_name", { ascending: true })

  if (districtName && districtName !== "all") {
    query = query.eq("district_name", districtName)
  }

  const { data, error } = await query
  if (error) {
    console.error("[getSettlementDescriptions] Error:", error)
    return []
  }

  return data || []
}

export async function getSettlementDescription(districtName: string, settlementName: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("settlement_descriptions")
    .select(
      "id, district_name, settlement_name, description, disclaimer, has_gas, has_electricity, has_water, has_installment, is_featured, created_at, updated_at",
    )
    .eq("district_name", districtName)
    .eq("settlement_name", settlementName)
    .maybeSingle()

  if (error) {
    console.error("[getSettlementDescription] Error:", error)
    return null
  }

  return data || null
}

export async function upsertSettlementDescription(districtName: string, settlementName: string, description: string) {
  const supabase = createAdminClient()

  const payload = {
    district_name: districtName,
    settlement_name: settlementName,
    description,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("settlement_descriptions")
    .upsert(payload, { onConflict: "district_name,settlement_name" })
    .select(
      "id, district_name, settlement_name, description, disclaimer, has_gas, has_electricity, has_water, has_installment, is_featured, created_at, updated_at",
    )
    .single()

  if (error) {
    console.error("[upsertSettlementDescription] Error:", error)
    throw new Error(error.message)
  }

  return data
}

export async function upsertSettlementDescriptionWithFlags(
  districtName: string,
  settlementName: string,
  payload: {
    description: string
    disclaimer?: string
    has_gas?: boolean
    has_electricity?: boolean
    has_water?: boolean
    has_installment?: boolean
    is_featured?: boolean
  },
) {
  const supabase = createAdminClient()

  const row = {
    district_name: districtName,
    settlement_name: settlementName,
    description: payload.description,
    disclaimer: payload.disclaimer ?? "",
    has_gas: payload.has_gas ?? false,
    has_electricity: payload.has_electricity ?? false,
    has_water: payload.has_water ?? false,
    has_installment: payload.has_installment ?? false,
    is_featured: payload.is_featured ?? false,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("settlement_descriptions")
    .upsert(row, { onConflict: "district_name,settlement_name" })
    .select(
      "id, district_name, settlement_name, description, has_gas, has_electricity, has_water, has_installment, is_featured, created_at, updated_at",
    )
    .single()

  if (error) {
    console.error("[upsertSettlementDescriptionWithFlags] Error:", error)
    throw new Error(error.message)
  }

  return data
}

export async function deleteSettlementDescription(districtName: string, settlementName: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("settlement_descriptions")
    .delete()
    .eq("district_name", districtName)
    .eq("settlement_name", settlementName)

  if (error) {
    console.error("[deleteSettlementDescription] Error:", error)
    throw new Error(error.message)
  }

  return { success: true }
}

export async function applySettlementDescriptionToPlots(
  settlementName: string,
  description: string,
  districtName?: string,
  flags?: {
    has_gas?: boolean
    has_electricity?: boolean
    has_water?: boolean
    has_installment?: boolean
    is_featured?: boolean
  }
): Promise<{ success: boolean; matchedCount: number; updatedCount: number; error?: string }> {
  const supabase = createAdminClient()

  try {
    const normalize = (s: string) =>
      s
        .replace(/\s+/g, " ")
        .replace(/^(п\.|пос\.|г\.|с\.|д\.)\s*/i, "")
        .trim()

    const base = normalize(settlementName)
    const variants = Array.from(
      new Set([
        settlementName.trim(),
        base,
        `пос. ${base}`,
        `п. ${base}`,
        `г. ${base}`,
        `с. ${base}`,
        `д. ${base}`,
      ].filter(Boolean))
    )

    // 1) Find plots to update (by district if provided, and by location variants)
    let findQuery = supabase.from("land_plots").select("id")
    if (districtName && districtName !== "all") {
      findQuery = findQuery.eq("district", districtName)
    }

    // exact matches for common variants
    findQuery = findQuery.in("location", variants)

    const { data: matched, error: findError } = await findQuery
    if (findError) {
      console.error("[applySettlementDescriptionToPlots] Find error:", findError)
      return { success: false, matchedCount: 0, updatedCount: 0, error: findError.message }
    }

    // fallback: try ilike if nothing matched (covers missing prefixes, small differences)
    let matchedIds = (matched || []).map((r: any) => r.id)
    if (matchedIds.length === 0 && base) {
      let fallbackQuery = supabase.from("land_plots").select("id")
      if (districtName && districtName !== "all") {
        fallbackQuery = fallbackQuery.eq("district", districtName)
      }
      const { data: fb, error: fbErr } = await fallbackQuery.ilike("location", `%${base}%`)
      if (fbErr) {
        console.error("[applySettlementDescriptionToPlots] Fallback find error:", fbErr)
        return { success: false, matchedCount: 0, updatedCount: 0, error: fbErr.message }
      }
      matchedIds = (fb || []).map((r: any) => r.id)
    }

    const matchedCount = matchedIds.length
    if (matchedCount === 0) {
      return { success: true, matchedCount: 0, updatedCount: 0 }
    }

    // 2) Update by ids
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (description?.trim()) {
      updatePayload.description = description
    }

    if (flags) {
      if (typeof flags.has_gas === "boolean") updatePayload.has_gas = flags.has_gas
      if (typeof flags.has_electricity === "boolean") updatePayload.has_electricity = flags.has_electricity
      if (typeof flags.has_water === "boolean") updatePayload.has_water = flags.has_water
      if (typeof flags.has_installment === "boolean") updatePayload.has_installment = flags.has_installment
      if (typeof flags.is_featured === "boolean") updatePayload.is_featured = flags.is_featured
    }

    const { data: updated, error: updateError } = await supabase
      .from("land_plots")
      .update(updatePayload)
      .in("id", matchedIds)
      .select("id")

    if (updateError) {
      console.error("[applySettlementDescriptionToPlots] Update error:", updateError)
      return { success: false, matchedCount, updatedCount: 0, error: updateError.message }
    }

    const updatedCount = updated?.length || 0

    revalidatePath("/")
    revalidatePath("/admin")

    return { success: true, matchedCount, updatedCount }
  } catch (error) {
    console.error("[applySettlementDescriptionToPlots] Error:", error)
    return { success: false, matchedCount: 0, updatedCount: 0, error: String(error) }
  }
}

export async function renameSettlement(
  kladrCode: string,
  newName: string
): Promise<{ success: boolean; updatedPlots: number; error?: string }> {
  const supabase = createAdminClient()

  try {
    // Get the current settlement info
    const { data: settlement, error: fetchError } = await supabase
      .from("kladr_places")
      .select("code, name, socr")
      .eq("code", kladrCode)
      .single()

    if (fetchError || !settlement) {
      return { success: false, updatedPlots: 0, error: "Поселок не найден" }
    }

    // Build the old full name (with prefix like "п. ")
    const oldFullName = (settlement.socr ? settlement.socr + ". " : "") + settlement.name

    // Update the settlement name in kladr_places
    const { error: updateKladrError } = await supabase
      .from("kladr_places")
      .update({ name: newName.replace(/^(п\.|г\.|с\.|д\.|пос\.)\s*/i, "").trim() })
      .eq("code", kladrCode)

    if (updateKladrError) {
      return { success: false, updatedPlots: 0, error: updateKladrError.message }
    }

    // Build the new full name
    const newFullName = (settlement.socr ? settlement.socr + ". " : "") + newName.replace(/^(п\.|г\.|с\.|д\.|пос\.)\s*/i, "").trim()

    // Update all land plots with this location
    const { data: updatedPlots, error: updatePlotsError } = await supabase
      .from("land_plots")
      .update({
        location: newFullName,
        updated_at: new Date().toISOString()
      })
      .eq("location", oldFullName)
      .select("id")

    if (updatePlotsError) {
      console.error("[renameSettlement] Error updating plots:", updatePlotsError)
      // Settlement was renamed but plots failed - still partial success
      return { success: true, updatedPlots: 0, error: "Поселок переименован, но участки не обновлены: " + updatePlotsError.message }
    }

    // Also update settlement_descriptions if exists
    await supabase
      .from("settlement_descriptions")
      .update({ settlement_name: newFullName })
      .eq("settlement_name", oldFullName)

    revalidatePath("/")
    revalidatePath("/admin")

    return { success: true, updatedPlots: updatedPlots?.length || 0 }
  } catch (error) {
    console.error("[renameSettlement] Error:", error)
    return { success: false, updatedPlots: 0, error: String(error) }
  }
}

export async function getDuplicateSettlements(): Promise<{
  inDistrict: Array<{
    name: string
    district: string
    count: number
    codes: string[]
  }>
  acrossDistricts: Array<{
    name: string
    districts: string[]
    count: number
  }>
}> {
  const supabase = createAdminClient()

  // Get all settlements
  const { data: settlements } = await supabase
    .from("kladr_places")
    .select("code, name, socr")
    .or("socr.eq.г,socr.eq.п,socr.eq.пос,socr.eq.с,socr.eq.д")

  // Get districts
  const { data: districts } = await supabase
    .from("kladr_places")
    .select("code, name, socr")
    .or("socr.eq.р-н,socr.eq.г.о.,socr.eq.городской округ,socr.eq.район")

  const districtMap: Record<string, string> = {}
  for (const d of districts || []) {
    districtMap[d.code.substring(0, 5)] = d.name + " " + d.socr
  }

  // Group by full name
  const byName: Record<string, Array<{ code: string; district: string }>> = {}
  for (const s of settlements || []) {
    const fullName = (s.socr ? s.socr + ". " : "") + s.name
    if (!byName[fullName]) byName[fullName] = []
    byName[fullName].push({
      code: s.code,
      district: districtMap[s.code.substring(0, 5)] || "Неизвестный район"
    })
  }

  const inDistrict: Array<{ name: string; district: string; count: number; codes: string[] }> = []
  const acrossDistricts: Array<{ name: string; districts: string[]; count: number }> = []

  for (const [name, items] of Object.entries(byName)) {
    // Group by district
    const byDistrict: Record<string, string[]> = {}
    for (const item of items) {
      if (!byDistrict[item.district]) byDistrict[item.district] = []
      byDistrict[item.district].push(item.code)
    }

    // Check for duplicates within same district
    for (const [district, codes] of Object.entries(byDistrict)) {
      if (codes.length > 1) {
        inDistrict.push({ name, district, count: codes.length, codes })
      }
    }

    // Check for same name across different districts
    const uniqueDistricts = Object.keys(byDistrict)
    if (uniqueDistricts.length > 1) {
      acrossDistricts.push({ name, districts: uniqueDistricts, count: items.length })
    }
  }

  return { inDistrict, acrossDistricts }
}

// ============ AI SETTINGS ============

const DEFAULT_SETTLEMENT_PROMPT = `Ты — эксперт по недвижимости в Калининградской области. 
Напиши привлекательное описание для земельного участка в указанном посёлке.
Описание должно включать:
- Эмодзи для визуального оформления (🏡📍🚌⚡🌲✅)
- Расположение и расстояние до Калининграда
- Транспортную доступность
- Коммуникации (электричество, газ, вода)
- Природу и экологию
- Преимущества покупки

Формат ответа — только текст описания, без дополнительных комментариев.
Пиши на русском языке. Используй реальные данные о посёлке если знаешь их.`

export async function getAiSettings(): Promise<{
  settlementPrompt: string
  apiProvider: string
}> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("organization_settings")
    .select("ai_settlement_prompt, ai_provider")
    .single()

  if (error || !data) {
    return {
      settlementPrompt: DEFAULT_SETTLEMENT_PROMPT,
      apiProvider: "perplexity",
    }
  }

  return {
    settlementPrompt: data.ai_settlement_prompt || DEFAULT_SETTLEMENT_PROMPT,
    apiProvider: data.ai_provider || "perplexity",
  }
}

export async function updateAiSettings(settings: {
  settlementPrompt?: string
  apiProvider?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (settings.settlementPrompt !== undefined) {
    updateData.ai_settlement_prompt = settings.settlementPrompt
  }
  if (settings.apiProvider !== undefined) {
    updateData.ai_provider = settings.apiProvider
  }

  const { error } = await supabase
    .from("organization_settings")
    .update(updateData)
    .eq("id", "00000000-0000-0000-0000-000000000001")

  if (error) {
    console.error("[updateAiSettings] Error:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function generateSettlementDescription(
  districtName: string,
  settlementName: string
): Promise<{ success: boolean; description?: string; error?: string }> {
  try {
    const settings = await getAiSettings()

    const apiUrl = process.env.PERPLEXITY_API_URL || "https://api.perplexity.ai/chat/completions"
    const apiKey = process.env.PERPLEXITY_API_KEY

    if (!apiKey) {
      return { success: false, error: "API ключ Perplexity не настроен" }
    }

    const userMessage = `Напиши описание для посёлка "${settlementName}" в ${districtName}, Калининградская область.`

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: settings.settlementPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[generateSettlementDescription] API Error:", errorText)
      return { success: false, error: `Ошибка API: ${response.status}` }
    }

    const data = await response.json()
    const generatedText = data.choices?.[0]?.message?.content || ""

    return { success: true, description: generatedText }
  } catch (error) {
    console.error("[generateSettlementDescription] Error:", error)
    return { success: false, error: String(error) }
  }
}

export async function getPlotGeometry(cadastralNumber: string): Promise<{
  type: string
  coordinates: any
  properties: any
  crs?: string
} | null> {
  const { client, coordsOrder } = await getConfiguredNspdClient()
  const { data: info } = await client.getObjectInfo(cadastralNumber, coordsOrder)

  if (!info) return null;

  return {
    type: info.geometry.type,
    coordinates: info.geometry.coordinates,
    properties: { address: info.address }, // Simplified properties for compatibility
    crs: info.geometry.crs?.properties?.name || "EPSG:3857"
  };
}

export async function syncPlotCoordinates(plotId: string, cadastralNumber: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { client, coordsOrder } = await getConfiguredNspdClient()

  try {
    const { data: info, error: nspdError } = await client.getObjectInfo(cadastralNumber, coordsOrder)

    if (!info) {
      await supabase
        .from("land_plots")
        .update({
          has_coordinates: false,
          sync_error: nspdError || "Объект не найден в НСПД",
          updated_at: new Date().toISOString(),
        })
        .eq("id", plotId)
      return false
    }

    const detectedStatus = client.detectLandStatus(info)
    const geometry = (info as any)?.geometry ?? null
    const geometryType = String(geometry?.type || "").trim() || null
    const hasContour = geometryType === "Polygon" || geometryType === "MultiPolygon"

    const centroid = Array.isArray((info as any).centroid_wgs84)
      ? ((info as any).centroid_wgs84 as [number, number])
      : null
    const centerLat = centroid && typeof centroid[0] === "number" ? centroid[0] : null
    const centerLon = centroid && typeof centroid[1] === "number" ? centroid[1] : null

    const hasAnyGeometry = !!geometry && typeof geometry === "object" && Array.isArray(geometry.coordinates)
    const hasAnyCoords = hasAnyGeometry || isValidCoordinate(centerLat, centerLon)
    const syncError =
      !hasAnyGeometry ? nspdError || "Геометрия не найдена" : centerLat === null || centerLon === null ? "Центр не рассчитан" : null

    // Auto-detect district: cadastral prefix first, coordinates as fallback
    let detectedDistrict: string | null = null
    try {
      detectedDistrict = await detectDistrict(cadastralNumber, centerLat, centerLon)
      if (detectedDistrict) {
        console.log(`[syncPlotCoordinates] Detected district for ${cadastralNumber}: ${detectedDistrict}`)
      }
    } catch (districtError) {
      console.warn(`[syncPlotCoordinates] Failed to detect district for ${cadastralNumber}:`, districtError)
    }

    const { error } = await supabase
      .from("land_plots")
      .update({
        coordinates_json: hasAnyGeometry ? geometry : null,
        geometry_type: geometryType,
        has_contour: hasContour,
        has_coordinates: hasAnyCoords,
        center_lat: centerLat,
        center_lon: centerLon,
        district: detectedDistrict || undefined, // Update district if detected
        land_status: detectedStatus || undefined, // Only update if detected
        vri_id: info.permitted_use || undefined,
        sync_error: syncError,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plotId)

    if (error) throw error

    if (hasAnyCoords) {
      // Auto-generate map image
      generatePlotMapImage(plotId).catch((e) =>
        console.error(`[syncPlotCoordinates] Failed to trigger image generation for ${plotId}:`, e)
      )
    }

    return hasAnyCoords
  } catch (error) {
    console.error(`[syncPlotCoordinates] Error for ${plotId}:`, error)

    try {
      await supabase
        .from("land_plots")
        .update({
          has_coordinates: false,
          sync_error: String((error as any)?.message || error),
          updated_at: new Date().toISOString(),
        })
        .eq("id", plotId)
    } catch (updateError) {
      console.error(`[syncPlotCoordinates] Failed to persist sync_error for ${plotId}:`, updateError)
    }

    return false
  }
}

/**
 * Manually sync coordinates and (optionally) address for a single plot.
 */
export async function syncSinglePlot(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: plot, error: fetchError } = await supabase
      .from("land_plots")
      .select("id, cadastral_number")
      .eq("id", id)
      .single()

    if (fetchError || !plot || !plot.cadastral_number) {
      return { success: false, error: "Участок с кадастровым номером не найден" }
    }

    const ok = await syncPlotCoordinates(plot.id, plot.cadastral_number)

    // Attempt to resolve address as well
    const addressRes = await resolveLocationByCadastral(plot.cadastral_number);
    if (addressRes.district || addressRes.location) {
      await supabase.from("land_plots").update({
        district: addressRes.district,
        location: addressRes.location,
        land_status: addressRes.land_status || undefined
      }).eq("id", plot.id);
    }

    if (ok || addressRes.district) {
      revalidatePath("/admin")
      return { success: true }
    } else {
      return { success: false, error: "Не удалось получить данные из НСПД" }
    }
  } catch (err) {
    console.error("[syncSinglePlot] Error:", err)
    return { success: false, error: String(err) }
  }
}

/**
 * Sync coordinates for a plot by its cadastral number.
 * Finds the plot in DB, fetches geometry from NSPD, saves to DB.
 * Returns detailed result with success/error info.
 */
export async function syncPlotByCadastralNumber(cadastralNumber: string): Promise<{
  success: boolean
  message: string
  details?: {
    plotId?: string
    plotTitle?: string
    geometry_type?: string
    centroid?: [number, number] | null
    hasContour?: boolean
  }
}> {
  "use server"

  if (!cadastralNumber || !cadastralNumber.trim()) {
    return { success: false, message: "Кадастровый номер не указан" }
  }

  const cadNum = cadastralNumber.trim()
  console.log(`[syncPlotByCadastralNumber] Starting sync for: ${cadNum}`)

  try {
    const supabase = createAdminClient()

    // Find plot by cadastral number
    const { data: plot, error: fetchError } = await supabase
      .from("land_plots")
      .select("id, title, cadastral_number")
      .eq("cadastral_number", cadNum)
      .maybeSingle()

    if (fetchError) {
      console.error("[syncPlotByCadastralNumber] DB error:", fetchError)
      return { success: false, message: `Ошибка БД: ${fetchError.message}` }
    }

    if (!plot) {
      return {
        success: false,
        message: `Участок с кадастровым номером ${cadNum} не найден в базе данных`
      }
    }

    // Get NSPD settings for proxy
    const { data: settings } = await supabase
      .from("organization_settings")
      .select("nspd_settings")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single()

    const nspd = (settings as any)?.nspd_settings as NspdSettings | null
    const proxyUrl = nspd?.proxy_auth?.trim() || nspd?.proxy_simple?.trim() || nspd?.proxy?.trim() || null
    const coordsOrder: "lat,lon" | "lon,lat" = nspd?.coords_order === "lon,lat" ? "lon,lat" : "lat,lon"

    // Create NSPD client with proxy
    const { NspdClient } = await import("@/lib/nspd-service/nspd-client")
    const client = new NspdClient({ proxy: proxyUrl || undefined })

    // Fetch from NSPD
    const { data: nspdData, error: nspdError } = await client.getObjectInfo(cadNum, coordsOrder)

    if (nspdError || !nspdData) {
      console.log(`[syncPlotByCadastralNumber] NSPD error for ${cadNum}: ${nspdError}`)

      // Update sync_error in DB
      await supabase
        .from("land_plots")
        .update({ sync_error: nspdError || "Данные не получены" })
        .eq("id", plot.id)

      return {
        success: false,
        message: nspdError || "Данные не получены из НСПД",
        details: { plotId: plot.id, plotTitle: plot.title }
      }
    }

    // Check if we got geometry
    const hasGeometry = !!nspdData.geometry
    const centroid = nspdData.centroid_wgs84 || null

    if (!hasGeometry && !centroid) {
      await supabase
        .from("land_plots")
        .update({ sync_error: "Геометрия не найдена в НСПД" })
        .eq("id", plot.id)

      return {
        success: false,
        message: "Геометрия не найдена в НСПД для этого участка",
        details: { plotId: plot.id, plotTitle: plot.title }
      }
    }

    // Save to database
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      sync_error: null,
    }

    if (hasGeometry) {
      updateData.coordinates_json = nspdData.geometry
    }

    if (centroid) {
      updateData.center_lat = centroid[0]
      updateData.center_lon = centroid[1]
      updateData.has_coordinates = true
    }

    const { error: updateError } = await supabase
      .from("land_plots")
      .update(updateData)
      .eq("id", plot.id)

    if (updateError) {
      console.error("[syncPlotByCadastralNumber] Update error:", updateError)
      return {
        success: false,
        message: `Ошибка сохранения: ${updateError.message}`,
        details: { plotId: plot.id, plotTitle: plot.title }
      }
    }

    console.log(`[syncPlotByCadastralNumber] Success for ${cadNum}: ${nspdData.geometry_type}`)

    revalidatePath("/admin")

    return {
      success: true,
      message: `Координаты сохранены для "${plot.title}"`,
      details: {
        plotId: plot.id,
        plotTitle: plot.title,
        geometry_type: nspdData.geometry_type,
        centroid: centroid,
        hasContour: hasGeometry
      }
    }

  } catch (err: any) {
    console.error("[syncPlotByCadastralNumber] Error:", err)
    return {
      success: false,
      message: `Ошибка: ${err.message || String(err)}`
    }
  }
}

export async function batchSyncCoordinates(limit = 20): Promise<{ success: boolean; processed: number; found: number }> {
  const supabase = createAdminClient()

  try {
    const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString()

    // Find plots without coordinates that have a cadastral number
    const { data: plots, error } = await supabase
      .from("land_plots")
      .select("id, cadastral_number")
      // Missing anything spatial: no contour OR no center OR has_coordinates not set.
      // Use a single OR group so that plots with partial data are still retried.
      // NOTE: do not reference optional columns (e.g. has_contour) to avoid runtime errors.
      .or(
        "coordinates_json.is.null,center_lat.is.null,center_lon.is.null,has_coordinates.is.null,has_coordinates.eq.false",
      )
      .not("cadastral_number", "is", null)
      .lt("updated_at", cutoff)
      .limit(limit)

    if (error) throw error
    if (!plots || plots.length === 0) return { success: true, processed: 0, found: 0 }

    let found = 0
    for (const plot of plots) {
      // 1. Try local JSON first
      const locallyApplied = await applyLocalCoordsFromFile(plot.id, plot.cadastral_number)
      if (locallyApplied !== "none") {
        found++
        continue
      }

      // 2. Fallback to NSPD
      const ok = await syncPlotCoordinates(plot.id, plot.cadastral_number)
      if (ok) found++
      // Throttle to respect NSPD API
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    revalidatePath("/admin")
    return { success: true, processed: plots.length, found }
  } catch (error) {
    console.error("[batchSyncCoordinates] Error:", error)
    return { success: false, processed: 0, found: 0 }
  }
}

/**
 * Automatically resolve location (district and settlement) from cadastral number using NSPD and KLADR.
 */
export async function resolveLocationByCadastral(cadastralNumber: string): Promise<{
  district?: string;
  location?: string;
  land_status?: string;
  center_lat?: number;
  center_lon?: number;
  geometry_type?: string;
  has_contour?: boolean;
  nspd_address?: string;
  error?: string;
  debug?: any;
}> {
  const { client, coordsOrder } = await getConfiguredNspdClient()

  try {
    const { data: info, error: nspdError } = await client.getObjectInfo(cadastralNumber, coordsOrder)

    if (nspdError || !info || !info.address) {
      return { error: nspdError || "Адрес не найден в НСПД" };
    }

    const nspdAddress = info.address;
    const landStatus = client.detectLandStatus(info);
    const centroid = Array.isArray((info as any).centroid_wgs84) ? ((info as any).centroid_wgs84 as [number, number]) : null;
    const centerLat = centroid && typeof centroid[0] === "number" ? centroid[0] : undefined;
    const centerLon = centroid && typeof centroid[1] === "number" ? centroid[1] : undefined;

    const geometryType = String((info as any)?.geometry?.type || "").trim() || undefined
    const hasContour = geometryType === "Polygon" || geometryType === "MultiPolygon"

    // Parse NSPD address to find district and settlement hints
    const parts = nspdAddress.split(',').map(p => p.trim());

    let detectedDistrictName = "";
    let detectedSettlementName = ""; // Can be settlement or city

    // 1. Detect District Hint from string
    const districtPart = parts.find(p =>
      p.includes("р-н") || p.includes("г.о.") || p.includes("городской округ") || p.includes("район")
    );

    if (districtPart) {
      detectedDistrictName = districtPart
        .replace(/р-н|г\.о\.|городской округ|район/g, "")
        .trim();
    }

    // 2. Detect Settlement Hint from string
    const settlementMarkers = ["г ", "п ", "пос ", "с ", "д ", "ст-ца ", "х "];
    const settlementPart = parts.find(p =>
      settlementMarkers.some(marker => p.startsWith(marker)) ||
      p.includes(" г") || p.includes(" п ") || p.includes(" пос")
    );

    if (settlementPart) {
      detectedSettlementName = settlementPart
        .replace(/г\.|п\.|пос\.|с\.|д\.|ст-ца|х\.|г |п |пос |с |д /g, "")
        .trim();
    } else if (!districtPart && parts.length > 2) {
      // Fallback usually for city districts if no explicit district part
      // e.g. "Калининградская обл, г Калининград, ..."
      const potentialCity = parts[1];
      if (potentialCity.includes("г ") || potentialCity.includes("г.")) {
        detectedSettlementName = potentialCity.replace(/г\.|г /g, "").trim();
      }
    }


    // 3. STRICT MATCHING AGAINST CONSTANTS (Existing Settlements)
    // We want to return ONLY values that exist in our defined list to maintain integrity.

    let finalDistrictName = "";
    let finalSettlementName = "";

    // Find matching settlements from the constant list
    const candidates = KALININGRAD_SETTLEMENTS.filter(s => {
      const settlementMatches = detectedSettlementName && s.name.toLowerCase().includes(detectedSettlementName.toLowerCase());
      // If district is detected, require it to match. If not detected, allow loose settlement match (risky, but useful)
      const districtMatches = detectedDistrictName
        ? s.district.toLowerCase().replace(" район", "").includes(detectedDistrictName.toLowerCase())
        : true;

      return settlementMatches && districtMatches;
    });

    if (candidates.length > 0) {
      // Prefer exact match if possible, otherwise first candidate
      const exactMatch = candidates.find(c =>
        c.name.toLowerCase() === (detectedSettlementName.toLowerCase().startsWith("п") ? detectedSettlementName.toLowerCase() : `п. ${detectedSettlementName.toLowerCase()}`) ||
        c.name.toLowerCase() === detectedSettlementName.toLowerCase()
      );

      const bestMatch = exactMatch || candidates[0];

      finalSettlementName = bestMatch.name;
      finalDistrictName = bestMatch.district;
    } else if (detectedSettlementName === "Калининград") {
      // Special case
      finalDistrictName = "г. Калининград";
      finalSettlementName = "г. Калининград";
    }

    // Fallback: If no settlement found but district found
    if (!finalDistrictName && detectedDistrictName) {
      const districtCandidate = KALININGRAD_DISTRICTS.find(d =>
        d.value !== "all" && d.label.toLowerCase().includes(detectedDistrictName.toLowerCase())
      );
      if (districtCandidate) {
        finalDistrictName = districtCandidate.label;
      }
    }

    return {
      district: finalDistrictName || undefined,
      location: finalSettlementName || undefined,
      land_status: landStatus || undefined,
      center_lat: centerLat,
      center_lon: centerLon,
      geometry_type: geometryType,
      has_contour: hasContour,
      nspd_address: nspdAddress,
      debug: { nspdAddress, detectedDistrictName, detectedSettlementName, finalDistrictName, finalSettlementName }
    };

  } catch (error) {
    console.error("[resolveLocationByCadastral] Error:", error);
    return { error: String(error) };
  }
}

// ============ FAQ ============

export async function getFaqItems(activeOnly = false): Promise<FaqItem[]> {
  const supabase = createAdminClient()

  let query = supabase.from("faq_items").select("*").order("sort_order", { ascending: true })

  if (activeOnly) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching faq items:", error)
    return []
  }

  return data as FaqItem[]
}

export async function createFaqItem(data: Partial<FaqItem>): Promise<FaqItem | null> {
  const supabase = createAdminClient()

  const { data: item, error } = await supabase
    .from("faq_items")
    .insert({
      question: data.question,
      answer: data.answer,
      category: data.category || "general",
      icon: data.icon,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating faq item:", error)
    throw new Error(error.message)
  }

  revalidatePath("/admin")
  revalidatePath("/faq")
  revalidatePath("/")

  return item as FaqItem
}

export async function updateFaqItem(id: string, data: Partial<FaqItem>): Promise<FaqItem | null> {
  const supabase = createAdminClient()

  const { data: item, error } = await supabase
    .from("faq_items")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating faq item:", error)
    throw new Error(error.message)
  }

  revalidatePath("/admin")
  revalidatePath("/faq")
  revalidatePath("/")

  return item as FaqItem
}

export async function deleteFaqItem(id: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase.from("faq_items").delete().eq("id", id)

  if (error) {
    console.error("Error deleting faq item:", error)
    throw new Error(error.message)
  }

  revalidatePath("/admin")
  revalidatePath("/faq")
}

// LEGAL CONTENT ACTIONS
export async function getLegalContent(onlyActive = false) {
  const supabase = createAdminClient()
  let query = supabase.from("legal_content").select("*").order("sort_order", { ascending: true })

  if (onlyActive) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query
  if (error) {
    console.error("Error fetching legal content:", error)
    return []
  }
  return data as LegalContent[]
}

export async function createLegalContent(data: Partial<LegalContent>) {
  const supabase = createAdminClient()
  const { data: inserted, error } = await supabase
    .from("legal_content")
    .insert(data)
    .select("*")
    .single()

  if (error) {
    console.error("Error creating legal content:", error)
    return null
  }
  revalidatePath("/admin")
  revalidatePath("/legal")
  return inserted as LegalContent
}

export async function updateLegalContent(id: string, data: Partial<LegalContent>) {
  const supabase = createAdminClient()
  const { data: updated, error } = await supabase
    .from("legal_content")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    console.error("Error updating legal content:", error)
    return null
  }
  revalidatePath("/admin")
  revalidatePath("/legal")
  return updated as LegalContent
}

export async function deleteLegalContent(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from("legal_content").delete().eq("id", id)
  if (error) {
    console.error("Error deleting legal content:", error)
    return false
  }
  revalidatePath("/admin")
  revalidatePath("/legal")
  return true
}

export async function reorderLegalContent(updates: { id: string; sort_order: number }[]) {
  const supabase = createAdminClient()
  // Manual reorder since RPC might not be available
  for (const update of updates) {
    await supabase.from("legal_content").update({ sort_order: update.sort_order }).eq("id", update.id)
  }

  revalidatePath("/admin")
  revalidatePath("/legal")
  return true
}


export async function reorderFaqItems(items: { id: string; sort_order: number }[]): Promise<{ success: boolean }> {
  const supabase = createAdminClient()

  // Use a transaction-like approach with multiple updates if supabase allows, 
  // or just run them in parallel for a small number of items.
  const updates = items.map((item) =>
    supabase.from("faq_items").update({ sort_order: item.sort_order }).eq("id", item.id)
  )

  await Promise.all(updates)

  revalidatePath("/admin")
  revalidatePath("/faq")
  return { success: true }
}

// ============ CHAT WIDGET ACTIONS ============

export async function getChatMessages(sessionId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) {
    const msg = String((error as any)?.message || "")
    const details = String((error as any)?.details || "")
    if (msg.includes("AbortError") || details.includes("AbortError")) {
      return []
    }
    console.error("[getChatMessages] Error:", error)
    return []
  }
  return data
}

export async function sendChatMessage(sessionId: string, text: string) {
  const supabase = createAdminClient()

  // 1. Ensure session exists or update last_message_at
  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .upsert({ id: sessionId, last_message_at: new Date().toISOString() }, { onConflict: "id" })
    .select()
    .single()

  if (sessionError) {
    console.error("[sendChatMessage] Session error:", sessionError)
    return { success: false, error: sessionError.message }
  }

  // 2. Save message locally
  const { data: message, error: messageError } = await supabase
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      text,
      sender: "user",
    })
    .select()
    .single()

  if (messageError) {
    console.error("[sendChatMessage] Message error:", messageError)
    return { success: false, error: messageError.message }
  }

  // 3. Send to Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const adminChatId = process.env.ADMIN_CHAT_ID

  if (botToken && adminChatId) {
    try {
      const tgMsg = `💬 <b>Новое сообщение из чата</b>\n\nID сессии: <code>${sessionId.slice(0, 8)}</code>\n\n${text}\n\n<i>Ответьте на это сообщение в Telegram, чтобы отправить ответ пользователю.</i>`

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: tgMsg,
          parse_mode: "HTML",
        }),
      })

      const tgData = await response.json()
      if (tgData.ok) {
        // Store telegram_message_id to map replies later
        await supabase
          .from("chat_messages")
          .update({ telegram_message_id: tgData.result.message_id })
          .eq("id", message.id)
      }
    } catch (e) {
      console.error("[sendChatMessage] TG error:", e)
    }
  }

  return { success: true, message }
}
