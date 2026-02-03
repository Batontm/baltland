import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enforceRateLimitOrThrow } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimitOrThrow({ request, action: "public_submit", maxPerHour: 3 })

    const body = await request.json()
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : ""
    const text = typeof body?.text === "string" ? body.text.trim() : ""

    if (!sessionId || !text) {
      return NextResponse.json({ success: false, error: "Некорректные данные" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error: sessionError } = await supabase
      .from("chat_sessions")
      .upsert({ id: sessionId, last_message_at: new Date().toISOString() }, { onConflict: "id" })

    if (sessionError) {
      return NextResponse.json({ success: false, error: sessionError.message }, { status: 500 })
    }

    const { data: message, error: messageError } = await supabase
      .from("chat_messages")
      .insert({ session_id: sessionId, text, sender: "user" })
      .select()
      .single()

    if (messageError) {
      return NextResponse.json({ success: false, error: messageError.message }, { status: 500 })
    }

    // Get bot config from DB
    const { data: settings } = await supabase
      .from("organization_settings")
      .select("telegram_bot_token, telegram_admin_chat_id, telegram_bots, chat_telegram_bot_id")
      .single()

    let botToken = process.env.TELEGRAM_BOT_TOKEN
    let adminChatId = process.env.ADMIN_CHAT_ID

    // Try to get from DB first
    if (settings) {
      // Fallback admin chat ID from global settings
      if (settings.telegram_admin_chat_id) {
        adminChatId = settings.telegram_admin_chat_id
      }

      const bots: any[] = Array.isArray(settings.telegram_bots) ? settings.telegram_bots : []
      let selectedBot = null

      // 1. Try to find bot explicitly selected for chat
      // @ts-ignore
      if (settings.chat_telegram_bot_id) {
        // @ts-ignore
        selectedBot = bots.find(b => b.id === settings.chat_telegram_bot_id)
      }

      // 2. Fallback to primary bot if no chat bot selected or not found
      if (!selectedBot) {
        selectedBot = bots.find(b => b.id === 'primary')
      }

      // 3. Use selected bot token and optional specific chat ID
      if (selectedBot?.token) {
        botToken = selectedBot.token
        // If bot has specific chat ID, use it (it overrides global adminChatId for this bot)
        if (selectedBot.chat_id) {
          adminChatId = selectedBot.chat_id
        }
      } else if (settings.telegram_bot_token) {
        // Legacy/Fallback to old column
        botToken = settings.telegram_bot_token
      }
    }

    if (botToken && adminChatId) {
      try {
        console.log(`[Chat Send] Using bot token: ${botToken.substring(0, 10)}... and admin chat ID: ${adminChatId}`)
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
          console.log(`[Chat Send] Successfully sent to Telegram. Message ID: ${tgData.result.message_id}`)
          await supabase
            .from("chat_messages")
            .update({ telegram_message_id: tgData.result.message_id })
            .eq("id", message.id)
        } else {
          console.error("[Chat Send] Telegram API Error:", tgData)
        }
      } catch (e) {
        console.error("[Chat Send] Fetch Error:", e)
      }
    } else {
      console.warn("[Chat Send] botToken or adminChatId is missing", { botToken: !!botToken, adminChatId: !!adminChatId })
    }

    return NextResponse.json({ success: true, message })
  } catch (e: any) {
    if (e?.code === "RATE_LIMIT") {
      return NextResponse.json(
        { success: false, error: "Слишком много сообщений. Попробуйте позже." },
        { status: 429 },
      )
    }
    return NextResponse.json({ success: false, error: "Ошибка сервера" }, { status: 500 })
  }
}
