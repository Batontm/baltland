import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TelegramBotConfig } from '@/lib/types'

export async function POST(request: NextRequest) {
    try {
        const { botId, chatId } = await request.json()

        const supabase = createAdminClient()
        const { data: settings } = await supabase
            .from('organization_settings')
            .select('telegram_bot_token, telegram_admin_chat_id, telegram_bots')
            .single()

        // Find the bot token from DB
        const bots: TelegramBotConfig[] = Array.isArray(settings?.telegram_bots) ? settings.telegram_bots : []

        let botToken: string | null = null

        if (botId === 'primary') {
            // Primary bot - check bots array first, then legacy column
            const primaryBot = bots.find(b => b.id === 'primary')
            botToken = primaryBot?.token || settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || null
        } else {
            // Secondary bot - find in bots array
            const bot = bots.find(b => b.id === botId)
            botToken = bot?.token || null
        }

        const recipientChatId = chatId || settings?.telegram_admin_chat_id || process.env.ADMIN_CHAT_ID

        if (!botToken) {
            return NextResponse.json({
                success: false,
                error: 'Токен бота не найден. Сохраните настройки и попробуйте снова.'
            })
        }

        if (!recipientChatId) {
            return NextResponse.json({
                success: false,
                error: 'Chat ID не настроен'
            })
        }

        const message = `✅ <b>Тестовое сообщение</b>

🤖 Бот: ${botId === 'primary' ? 'Основной' : botId}
⏰ Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Kaliningrad' })}

<i>Это сообщение отправлено из админ-панели.</i>`

        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: recipientChatId,
                text: message,
                parse_mode: 'HTML'
            })
        })

        const data = await res.json()

        if (data.ok) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ success: false, error: data.description })
        }
    } catch (error) {
        console.error('[Telegram Test] Error:', error)
        return NextResponse.json({ success: false, error: 'Ошибка отправки сообщения' })
    }
}
