import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TelegramBotConfig } from '@/lib/types'

const TELEGRAM_API = 'https://api.telegram.org/bot'

async function getTokenFromDb(botId: string): Promise<string | null> {
    const supabase = createAdminClient()

    const { data: settings } = await supabase
        .from('organization_settings')
        .select('telegram_bot_token, telegram_bots')
        .single()

    if (botId === 'primary') {
        // Check in bots array first
        const bots: TelegramBotConfig[] = Array.isArray(settings?.telegram_bots) ? settings.telegram_bots : []
        const primaryBot = bots.find(b => b.id === 'primary')
        return primaryBot?.token || settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || null
    }

    // Find secondary bot
    const bots: TelegramBotConfig[] = Array.isArray(settings?.telegram_bots) ? settings.telegram_bots : []
    const bot = bots.find(b => b.id === botId)
    return bot?.token || null
}

export async function POST(request: NextRequest) {
    try {
        const { botId, token, url } = await request.json()

        // Use provided token or get from DB
        const botToken = token && !token.includes('...') ? token : await getTokenFromDb(botId)

        if (!botToken) {
            return NextResponse.json({ success: false, error: 'Токен бота не найден' })
        }

        if (!url) {
            return NextResponse.json({ success: false, error: 'URL не указан' })
        }

        const finalUrl = `${url}${url.includes('?') ? '&' : '?'}botId=${botId}`
        const res = await fetch(
            `${TELEGRAM_API}${botToken}/setWebhook?url=${encodeURIComponent(finalUrl)}`
        )
        const data = await res.json()

        if (data.ok) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ success: false, error: data.description })
        }
    } catch (error) {
        console.error('[Telegram Webhook] Error:', error)
        return NextResponse.json({ success: false, error: 'Ошибка установки webhook' })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { botId, token } = await request.json()

        const botToken = token && !token.includes('...') ? token : await getTokenFromDb(botId)

        if (!botToken) {
            return NextResponse.json({ success: false, error: 'Токен бота не найден' })
        }

        const res = await fetch(`${TELEGRAM_API}${botToken}/deleteWebhook`)
        const data = await res.json()

        if (data.ok) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ success: false, error: data.description })
        }
    } catch (error) {
        console.error('[Telegram Webhook] Error:', error)
        return NextResponse.json({ success: false, error: 'Ошибка удаления webhook' })
    }
}
