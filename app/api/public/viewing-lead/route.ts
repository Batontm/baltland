import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enforceRateLimitOrThrow } from "@/lib/rate-limit"
import { sendMessageWithButtons } from "@/lib/telegram"

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimitOrThrow({ request, action: "public_submit", maxPerHour: 3 })

    const body = await request.json()
    const phone = typeof body?.phone === "string" ? body.phone.trim() : ""
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const messengerWhatsapp = !!body?.messenger_whatsapp
    const messengerTelegram = !!body?.messenger_telegram
    const messengerMax = !!body?.messenger_max
    const consent = !!body?.consent

    const plot = body?.plot
    const plotId = typeof plot?.id === "string" ? plot.id : ""

    if (!plotId || !phone || !consent) {
      return NextResponse.json({ success: false, error: "Некорректные данные" }, { status: 400 })
    }

    const wishesParts: string[] = []
    if (consent) wishesParts.push("consent")
    if (messengerMax) wishesParts.push("max")
    if (messengerTelegram) wishesParts.push("telegram")
    if (messengerWhatsapp) wishesParts.push("whatsapp")

    const supabase = createAdminClient()
    const { error } = await supabase.from("leads").insert({
      name: name || "Без имени",
      phone,
      wishes: wishesParts.length ? wishesParts.join(",") : null,
      lead_type: "viewing",
      plot_id: plotId,
      plot_location: typeof plot?.location === "string" ? plot.location : null,
      plot_cadastral_number: typeof plot?.cadastral_number === "string" ? plot.cadastral_number : null,
      plot_price: typeof plot?.price === "number" ? plot.price : null,
      plot_area_sotok: typeof plot?.area_sotok === "number" ? plot.area_sotok : null,
      messenger_whatsapp: messengerWhatsapp,
      messenger_telegram: messengerTelegram,
      status: "new",
    })

    if (error) {
      return NextResponse.json({ success: false, error: "Ошибка отправки заявки" }, { status: 500 })
    }

    const cleanPhone = phone.replace(/\D/g, "")
    const messengers: string[] = []
    if (messengerTelegram) messengers.push("Telegram")
    if (messengerWhatsapp) messengers.push("WhatsApp")
    if (messengerMax) messengers.push("MAX")

    const priceFormatted = typeof plot?.price === "number" ? `${(plot.price / 1000000).toFixed(1)} млн ₽` : "не указана"
    const areaFormatted = typeof plot?.area_sotok === "number" ? `${plot.area_sotok} сот.` : ""

    let message = `🔔 <b>Новая заявка на просмотр!</b>\n\n👤 <b>Имя:</b> ${name || "Без имени"}\n📞 <b>Телефон:</b> ${phone}`
    if (messengers.length > 0) {
      message += `\n💬 <b>Мессенджеры:</b> ${messengers.join(", ")}`
    }

    const cadastralLink = plot?.cadastral_number
      ? `<a href="https://nspd.gov.ru/map?thematic=PKK&query=${encodeURIComponent(plot.cadastral_number)}">${plot.cadastral_number}</a>`
      : "—"

    message += `\n\n🏞 <b>Участок:</b> ${plot?.location || "Не указан"}\n📍 <b>Кадастр:</b> ${cadastralLink}\n💰 <b>Цена:</b> ${priceFormatted} ${areaFormatted ? `(${areaFormatted})` : ""}\n\n📲 <b>Быстрая связь:</b>\n• <a href="https://wa.me/${cleanPhone}">WhatsApp</a>\n• <a href="tel:${phone}">Позвонить</a>\n• <a href="https://max.ru/im?phone=${cleanPhone}">MAX</a>`

    const buttons = [
      [
        { text: "📋 КП по участку", callback_data: `kp:${plotId}` },
        { text: "🏘 Все в посёлке", callback_data: `location:${plot?.location || ""}` },
      ],
      [{ text: "✅ Обработано", callback_data: `done:${plotId}` }],
    ]

    await sendMessageWithButtons(message, buttons)

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
