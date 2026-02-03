import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enforceRateLimitOrThrow } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimitOrThrow({ request, action: "public_submit", maxPerHour: 3 })

    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim() : ""

    if (!email) {
      return NextResponse.json({ success: false, error: "Некорректный email" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("subscribers").insert({ email })

    if (error) {
      if ((error as any).code === "23505") {
        return NextResponse.json({ success: false, error: "Этот email уже подписан" }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: "Ошибка подписки" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.code === "RATE_LIMIT") {
      return NextResponse.json(
        { success: false, error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 },
      )
    }
    return NextResponse.json({ success: false, error: "Ошибка сервера" }, { status: 500 })
  }
}
