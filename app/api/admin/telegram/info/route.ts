import { NextResponse } from 'next/server'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID

export async function GET() {
    if (!TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN не настроен' })
    }

    try {
        // Get bot info
        const botRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
        const botData = await botRes.json()

        // Get webhook info
        const webhookRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
        const webhookData = await webhookRes.json()

        return NextResponse.json({
            success: true,
            bot: botData.ok ? botData.result : null,
            webhook: webhookData.ok ? webhookData.result : null,
            adminChatId: ADMIN_CHAT_ID || null
        })
    } catch (error) {
        console.error('[Telegram Info] Error:', error)
        return NextResponse.json({ success: false, error: 'Ошибка получения информации' })
    }
}
