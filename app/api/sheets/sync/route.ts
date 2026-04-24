import { NextRequest, NextResponse } from "next/server"
import { syncFromSheets, type SyncRequest } from "@/lib/sheets-sync"

// POST /api/sheets/sync
// Приём данных из Google Sheets и синхронизация с БД
export async function POST(request: NextRequest) {
  // Авторизация
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.SHEETS_SYNC_SECRET

  if (!expectedSecret) {
    console.error("[sheets/sync] SHEETS_SYNC_SECRET не настроен")
    return NextResponse.json(
      { success: false, error: "SHEETS_SYNC_SECRET не настроен на сервере" },
      { status: 500 }
    )
  }

  const token = authHeader?.replace("Bearer ", "")
  if (token !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: "Неверный токен авторизации" },
      { status: 401 }
    )
  }

  // Парсинг тела запроса
  let body: SyncRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Невалидный JSON" },
      { status: 400 }
    )
  }

  // Проверка структуры
  if (!body.rows || !Array.isArray(body.rows)) {
    return NextResponse.json(
      { success: false, error: "Поле rows обязательно и должно быть массивом" },
      { status: 400 }
    )
  }

  if (body.rows.length > 200) {
    return NextResponse.json(
      { success: false, error: "Максимум 200 строк за один запрос" },
      { status: 400 }
    )
  }

  if (!body.deleted_cadastrals) {
    body.deleted_cadastrals = []
  }

  // Синхронизация
  try {
    console.log(`[sheets/sync] Получено: ${body.rows.length} строк, ${body.deleted_cadastrals.length} удалений`)

    const result = await syncFromSheets(body)

    console.log(`[sheets/sync] Результат: +${result.summary.added} ~${result.summary.updated} -${result.summary.archived} ✗${result.summary.errors}`)

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[sheets/sync] Ошибка:", err)
    return NextResponse.json(
      { success: false, error: "Внутренняя ошибка сервера: " + err.message },
      { status: 500 }
    )
  }
}
