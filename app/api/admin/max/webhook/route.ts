import { NextRequest, NextResponse } from "next/server"

const MAX_API_BASE = "https://platform-api.max.ru"
const DEFAULT_UPDATE_TYPES = ["message_created", "bot_started", "message_callback"]

function getMaxToken() {
  const token = process.env.MAX_BOT_TOKEN
  if (!token) {
    throw new Error("MAX_BOT_TOKEN не настроен")
  }
  return token
}

function getWebhookSecret() {
  return process.env.MAX_WEBHOOK_SECRET || null
}

async function maxApiRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${MAX_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: getMaxToken(),
      ...(init?.headers || {}),
    },
  })

  const raw = await response.text()
  let payload: Record<string, unknown> | null = null
  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const details = payload?.message || raw || `HTTP ${response.status}`
    throw new Error(`MAX API error: ${details}`)
  }

  return payload
}

export async function GET() {
  try {
    const data = await maxApiRequest("/subscriptions", { method: "GET" })
    return NextResponse.json({
      success: true,
      subscriptions: data?.subscriptions || [],
    })
  } catch (error) {
    console.error("[MAX Webhook Admin] GET error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ошибка получения подписок" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const domain = typeof body?.domain === "string" ? body.domain.trim() : ""
    const urlFromBody = typeof body?.url === "string" ? body.url.trim() : ""

    const webhookUrl =
      urlFromBody ||
      (domain ? `${domain.replace(/\/$/, "")}/api/max-bot/webhook` : "")

    if (!webhookUrl.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "Webhook URL должен начинаться с https://" },
        { status: 400 },
      )
    }

    const updateTypes = Array.isArray(body?.update_types)
      ? body.update_types.filter((item: unknown): item is string => typeof item === "string" && item.length > 0)
      : DEFAULT_UPDATE_TYPES

    const payload: Record<string, unknown> = {
      url: webhookUrl,
      update_types: updateTypes,
    }

    const secret = getWebhookSecret()
    if (secret) {
      payload.secret = secret
    }

    const data = await maxApiRequest("/subscriptions", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    return NextResponse.json({
      success: true,
      result: data || null,
      webhookUrl,
      updateTypes,
      hasSecret: Boolean(secret),
    })
  } catch (error) {
    console.error("[MAX Webhook Admin] POST error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ошибка установки webhook" },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    const data = await maxApiRequest("/subscriptions", { method: "DELETE" })
    return NextResponse.json({ success: true, result: data || null })
  } catch (error) {
    console.error("[MAX Webhook Admin] DELETE error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ошибка удаления webhook" },
      { status: 500 },
    )
  }
}
