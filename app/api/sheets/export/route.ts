import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/sheets/export?secret=SHEETS_SYNC_SECRET
// Возвращает все участки в формате для Google Sheets
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  const expectedSecret = process.env.SHEETS_SYNC_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "SHEETS_SYNC_SECRET не настроен на сервере" },
      { status: 500 }
    )
  }

  if (secret !== expectedSecret) {
    return NextResponse.json(
      { error: "Неверный секретный ключ" },
      { status: 401 }
    )
  }

  try {
    const supabase = createAdminClient()

    const { data: plots, error } = await supabase
      .from("land_plots")
      .select("*")
      .order("district", { ascending: true })
      .order("location", { ascending: true })
      .order("title", { ascending: true })

    if (error) {
      console.error("[sheets/export] Supabase error:", error)
      return NextResponse.json(
        { error: "Ошибка при получении данных: " + error.message },
        { status: 500 }
      )
    }

    if (!plots || plots.length === 0) {
      return NextResponse.json({ rows: [], count: 0 })
    }

    // Маппинг в формат таблицы (порядок столбцов A-AD)
    const rows = plots.map((p: any) => [
      p.id || "",                                           // A: ID
      p.int_id || "",                                       // B: INT_ID
      p.cadastral_number || "",                             // C: Кадастровый номер
      p.title || "",                                        // D: Название
      p.description || "",                                  // E: Описание
      p.price || 0,                                         // F: Цена
      p.area_sotok || 0,                                    // G: Площадь
      p.district || "",                                     // H: Район
      p.location || "",                                     // I: Населённый пункт
      p.distance_to_sea ?? "",                              // J: Расстояние до моря
      p.land_status || "ИЖС",                              // K: Категория земли
      !!p.has_gas,                                          // L: Газ
      !!p.has_electricity,                                  // M: Электричество
      !!p.has_water,                                        // N: Вода
      !!p.has_installment,                                  // O: Рассрочка
      mapStatus(p),                                         // P: Статус
      !!p.is_featured,                                      // Q: Избранное
      p.ownership_type || "",                               // R: Тип собственности
      p.lease_from || "",                                   // S: Аренда с
      p.lease_to || "",                                     // T: Аренда по
      p.vri_id || "",                                       // U: ВРИ
      p.bundle_id || "",                                    // V: Лот (группа)
      p.bundle_title || "",                                 // W: Название лота
      !!p.is_bundle_primary,                                // X: Главный в лоте
      p.image_url || "",                                    // Y: Фото (URL)
      p.youtube_video_url || "",                            // Z: YouTube
      p.rutube_video_url || "",                             // AA: RuTube
      formatAdditionalCadastrals(p.additional_cadastral_numbers), // AB: Доп. кадастровые
      "✅ Импорт из БД",                                    // AC: Sync
      "",                                                   // AD: Ошибка sync
    ])

    return NextResponse.json({
      rows,
      count: rows.length,
    })
  } catch (err: any) {
    console.error("[sheets/export] Error:", err)
    return NextResponse.json(
      { error: "Внутренняя ошибка: " + err.message },
      { status: 500 }
    )
  }
}

// Маппинг полей БД → статус в таблице
function mapStatus(plot: any): string {
  if (!plot.is_active && plot.status === "archived") return "Продан"
  if (!plot.is_active) return "Черновик"
  if (plot.is_reserved) return "Забронирован"
  return "Доступен"
}

// Форматирование массива доп. кадастровых номеров в строку через запятую
function formatAdditionalCadastrals(value: any): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "string") return value
  return ""
}
