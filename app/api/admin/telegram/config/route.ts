import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TelegramBotConfig } from '@/lib/types'

const TELEGRAM_API = 'https://api.telegram.org/bot'

interface BotStatus {
    botInfo: { id: number; first_name: string; username: string } | null
    webhookInfo: { url: string; pending_update_count: number; last_error_message?: string } | null
    error?: string
}

async function getBotStatus(token: string): Promise<BotStatus> {
    if (!token || token.includes('...')) {
        return { botInfo: null, webhookInfo: null }
    }

    try {
        const [botRes, webhookRes] = await Promise.all([
            fetch(`${TELEGRAM_API}${token}/getMe`),
            fetch(`${TELEGRAM_API}${token}/getWebhookInfo`)
        ])

        const [botData, webhookData] = await Promise.all([
            botRes.json(),
            webhookRes.json()
        ])

        return {
            botInfo: botData.ok ? botData.result : null,
            webhookInfo: webhookData.ok ? webhookData.result : null,
            error: !botData.ok ? (botData.description || 'Неверный токен') : undefined
        }
    } catch (e) {
        console.error('[Telegram Config] Error fetching bot status:', e)
        return { botInfo: null, webhookInfo: null, error: 'Ошибка подключения' }
    }
}

// GET - Load config and bot info
export async function GET() {
    const supabase = createAdminClient()

    const { data: settings } = await supabase
        .from('organization_settings')
        .select('telegram_bot_token, telegram_admin_chat_id, telegram_webhook_url, telegram_bots, telegram_domain')
        .single()

    // Parse bots array
    const bots: TelegramBotConfig[] = Array.isArray(settings?.telegram_bots) ? settings.telegram_bots : []

    // Create primary bot config
    const primaryBot: TelegramBotConfig = {
        id: 'primary',
        name: 'Основной бот',
        token: settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '',
        enabled_events: ['errors'] // Default for primary bot
    }

    // Check if we have saved primary bot events
    const savedPrimaryBot = bots.find(b => b.id === 'primary')
    if (savedPrimaryBot) {
        primaryBot.enabled_events = savedPrimaryBot.enabled_events
        primaryBot.token = savedPrimaryBot.token || primaryBot.token
    }

    // Get secondary bots (non-primary)
    const secondaryBots = bots.filter(b => b.id !== 'primary')

    const config = {
        domain: settings?.telegram_domain || '',
        adminChatId: settings?.telegram_admin_chat_id || process.env.ADMIN_CHAT_ID || '',
        webhookUrl: settings?.telegram_webhook_url || '',
        primaryBot: {
            ...primaryBot,
            token: primaryBot.token ? primaryBot.token.substring(0, 10) + '...' + primaryBot.token.slice(-5) : ''
        },
        bots: secondaryBots.map(bot => ({
            ...bot,
            token: bot.token ? bot.token.substring(0, 10) + '...' + bot.token.slice(-5) : ''
        }))
    }

    // Fetch bot statuses for all bots with tokens
    const botStatuses: Record<string, BotStatus> = {}

    if (primaryBot.token && !primaryBot.token.includes('...')) {
        botStatuses['primary'] = await getBotStatus(primaryBot.token)
    } else if (settings?.telegram_bot_token) {
        botStatuses['primary'] = await getBotStatus(settings.telegram_bot_token)
    }

    for (const bot of secondaryBots) {
        if (bot.token && !bot.token.includes('...')) {
            botStatuses[bot.id] = await getBotStatus(bot.token)
        }
    }

    return NextResponse.json({
        success: true,
        config,
        botStatuses
    })
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { domain, adminChatId, primaryBot, bots, twoFactorEnabled } = body

        // Validate
        if (!domain) {
            return NextResponse.json({ success: false, error: 'Домен обязателен' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Get current settings
        const { data: currentSettings } = await supabase
            .from('organization_settings')
            .select('telegram_bot_token, telegram_bots')
            .single()

        // Construct webhook URL
        const webhookUrl = `${domain.replace(/\/$/, '')}/api/telegram/webhook`

        // Prepare all bots array
        const allBots: TelegramBotConfig[] = []

        // Validate and add primary bot
        let validatedPrimaryToken = currentSettings?.telegram_bot_token || ''
        if (primaryBot) {
            // Validate token if changed
            const primaryToken = primaryBot.token?.includes('...') ? (currentSettings?.telegram_bot_token || '') : (primaryBot.token || '')

            if (primaryBot.token && !primaryBot.token.includes('...')) {
                try {
                    const botRes = await fetch(`${TELEGRAM_API}${primaryBot.token}/getMe`)
                    const botData = await botRes.json()
                    if (!botData.ok) {
                        return NextResponse.json({
                            success: false,
                            error: 'Неверный токен основного бота: ' + (botData.description || 'проверьте токен')
                        })
                    }
                    validatedPrimaryToken = primaryBot.token
                } catch (e) {
                    return NextResponse.json({ success: false, error: 'Не удалось проверить токен основного бота' })
                }
            }

            allBots.push({
                id: 'primary',
                name: primaryBot.name || 'Основной бот',
                token: primaryToken || validatedPrimaryToken,
                enabled_events: primaryBot.enabled_events || ['errors']
            })
        }

        // Process secondary bots
        const currentBots: TelegramBotConfig[] = Array.isArray(currentSettings?.telegram_bots)
            ? currentSettings.telegram_bots.filter((b: TelegramBotConfig) => b.id !== 'primary')
            : []

        for (const bot of (bots || [])) {
            // Find existing bot to get stored token if masked
            const existingBot = currentBots.find((b: TelegramBotConfig) => b.id === bot.id)
            let finalToken = existingBot?.token || ''

            // If new token provided (not masked), validate and use it
            if (bot.token && !bot.token.includes('...')) {
                try {
                    const botRes = await fetch(`${TELEGRAM_API}${bot.token}/getMe`)
                    const botData = await botRes.json()
                    if (!botData.ok) {
                        return NextResponse.json({
                            success: false,
                            error: `Неверный токен бота "${bot.name}": ${botData.description || 'проверьте токен'}`
                        })
                    }
                    finalToken = bot.token
                } catch (e) {
                    return NextResponse.json({ success: false, error: `Не удалось проверить токен бота "${bot.name}"` })
                }
            } else if (bot.token && bot.token.includes('...')) {
                // Keep existing token
                finalToken = existingBot?.token || ''
            }

            allBots.push({
                id: bot.id,
                name: bot.name,
                token: finalToken,
                chat_id: bot.chat_id,
                enabled_events: bot.enabled_events || []
            })
        }

        // Build update object
        const updateData: Record<string, any> = {
            telegram_admin_chat_id: adminChatId || '',
            telegram_domain: domain || '',
            telegram_webhook_url: webhookUrl,
            telegram_bots: allBots,
            two_factor_auth_enabled: twoFactorEnabled
        }

        // Update primary bot token in legacy column if changed
        if (validatedPrimaryToken && validatedPrimaryToken !== currentSettings?.telegram_bot_token) {
            updateData.telegram_bot_token = validatedPrimaryToken
        }

        const { error } = await supabase
            .from('organization_settings')
            .update(updateData)
            .not('id', 'is', null) // Safe update target

        if (error) {
            console.error('[Telegram Config] Error saving:', error)
            return NextResponse.json({ success: false, error: 'Ошибка сохранения: ' + error.message })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[Telegram Config] Error:', error)
        return NextResponse.json({ success: false, error: 'Ошибка сохранения настроек: ' + error.message }, { status: 500 })
    }
}
