import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enforceRateLimitOrThrow } from "@/lib/rate-limit"
import { sendMessageToAdmin } from "@/lib/telegram"

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimitOrThrow({ request, action: "public_submit", maxPerHour: 3 })

    const body = await request.json()
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const phone = typeof body?.phone === "string" ? body.phone.trim() : ""
    const wishes = typeof body?.wishes === "string" ? body.wishes.trim() : ""
    const leadType = body?.lead_type === "faq" ? "faq" : "general"

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: "Некорректные данные" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("leads").insert({
      name,
      phone,
      wishes: wishes || null,
      lead_type: leadType,
      status: "new",
    })

    if (error) {
      return NextResponse.json({ success: false, error: "Ошибка отправки заявки" }, { status: 500 })
    }

    const typeText = leadType === "faq" ? "Вопрос из FAQ" : "Новая заявка"
    await sendMessageToAdmin(`🔔 <b>${typeText}!</b>\n\n👤 <b>Имя:</b> ${name}\n📞 <b>Телефон:</b> ${phone}${wishes ? `\n💬 ${leadType === 'faq' ? 'Вопрос' : 'Пожелания'}: ${wishes}` : ''}`)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.code === "RATE_LIMIT") {
      return NextResponse.json(
        { success: false, error: "Слишком много заявок. Попробуйте позже." },
        { status: 429 },
      )
    }
    return NextResponse.json({ success: false, error: "Ошибка сервера" }, { status: 500 })
  }
}
