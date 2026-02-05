import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enforceRateLimitOrThrow } from "@/lib/rate-limit"
import { sendMessageWithButtons } from "@/lib/telegram"

export async function POST(request: NextRequest) {
    try {
        await enforceRateLimitOrThrow({ request, action: "public_submit", maxPerHour: 5 })

        const body = await request.json()
        const contact = typeof body?.contact === "string" ? body.contact.trim() : ""
        const plot = body?.plot

        if (!contact) {
            return NextResponse.json({ success: false, error: "Укажите контакт" }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Insert into leads table
        const { error } = await supabase.from("leads").insert({
            name: "Запрос через Share",
            phone: contact,
            lead_type: "share",
            plot_location: typeof plot?.location === "string" ? plot.location : null,
            plot_cadastral_number: typeof plot?.cadastral_number === "string" ? plot.cadastral_number : null,
            plot_price: typeof plot?.price === "number" ? plot.price : null,
            plot_area_sotok: typeof plot?.area === "number" ? plot.area : null,
            status: "new",
        })

        if (error) {
            console.error("Failed to insert share lead:", error)
            return NextResponse.json({ success: false, error: "Ошибка сохранения заявки" }, { status: 500 })
        }

        // Format message for Telegram
        const priceFormatted = typeof plot?.price === "number"
            ? `${(plot.price / 1000000).toFixed(1)} млн ₽`
            : "не указана"
        const areaFormatted = typeof plot?.area === "number" ? `${plot.area} сот.` : ""

        const cadastralLink = plot?.cadastral_number
            ? `<a href="https://nspd.gov.ru/map?thematic=PKK&query=${encodeURIComponent(plot.cadastral_number)}">${plot.cadastral_number}</a>`
            : "—"

        const isPhone = /^\+?\d/.test(contact)
        const cleanContact = contact.replace(/\D/g, "")

        let contactLinks = ""
        if (isPhone) {
            contactLinks = `\n• <a href="https://wa.me/${cleanContact}">WhatsApp</a>\n• <a href="tel:${contact}">Позвонить</a>\n• <a href="https://max.ru/im?phone=${cleanContact}">MAX</a>`
        } else if (contact.startsWith("@")) {
            contactLinks = `\n• <a href="https://t.me/${contact.slice(1)}">Telegram</a>`
        }

        let message = `📤 <b>Запрос на подробности!</b>\n\n📞 <b>Контакт:</b> ${contact}${contactLinks}`

        message += `\n\n🏞 <b>Участок:</b> ${plot?.location || "Не указан"}\n📍 <b>Кадастр:</b> ${cadastralLink}\n💰 <b>Цена:</b> ${priceFormatted} ${areaFormatted ? `(${areaFormatted})` : ""}`

        if (plot?.url) {
            message += `\n\n🔗 <a href="${plot.url}">Ссылка на участок</a>`
        }

        const buttons = [
            [{ text: "✅ Обработано", callback_data: `done:share` }],
        ]

        await sendMessageWithButtons(message, buttons, 'leads')

        return NextResponse.json({ success: true })
    } catch (e: any) {
        if (e?.code === "RATE_LIMIT") {
            return NextResponse.json(
                { success: false, error: "Слишком много заявок. Попробуйте позже." },
                { status: 429 },
            )
        }
        console.error("Share lead error:", e)
        return NextResponse.json({ success: false, error: "Ошибка сервера" }, { status: 500 })
    }
}
