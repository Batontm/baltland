import { NextRequest, NextResponse } from "next/server"
import { handleMaxUpdate } from "@/lib/max-bot"

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const updateType = typeof payload?.update_type === "string" ? payload.update_type : "unknown"
    console.log("[MAX Webhook] update_type:", updateType)
    console.log("[MAX Webhook] payload:", JSON.stringify(payload))
    await handleMaxUpdate(payload)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[MAX Webhook] POST error:", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
