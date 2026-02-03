import { createAdminClient } from '@/lib/supabase/admin'
import { TelegramBotConfig, TelegramBotEventType } from './types'

// Fallback to env vars if DB not configured
const ENV_TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ENV_ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID

/**
 * Получает настройки Telegram из БД или env переменных
 */
async function getTelegramConfig(): Promise<{
    chatId: string | null;
    bots: TelegramBotConfig[];
}> {
    try {
        const supabase = createAdminClient()
        const { data: settings } = await supabase
            .from('organization_settings')
            .select('telegram_bot_token, telegram_admin_chat_id, telegram_bots')
            .single()

        const bots: TelegramBotConfig[] = Array.isArray(settings?.telegram_bots) ? settings.telegram_bots : []

        // If no primary bot in array, add from legacy field
        const hasPrimaryBot = bots.some(b => b.id === 'primary')
        if (!hasPrimaryBot && (settings?.telegram_bot_token || ENV_TELEGRAM_BOT_TOKEN)) {
            bots.unshift({
                id: 'primary',
                name: 'Основной бот',
                token: settings?.telegram_bot_token || ENV_TELEGRAM_BOT_TOKEN || '',
                enabled_events: ['errors']
            })
        }

        return {
            chatId: settings?.telegram_admin_chat_id || ENV_ADMIN_CHAT_ID || null,
            bots
        }

    } catch {
        // Fallback to env vars if DB fails
        const bots: TelegramBotConfig[] = []
        if (ENV_TELEGRAM_BOT_TOKEN) {
            bots.push({
                id: 'primary',
                name: 'Основной бот',
                token: ENV_TELEGRAM_BOT_TOKEN,
                enabled_events: ['errors']
            })
        }
        return {
            chatId: ENV_ADMIN_CHAT_ID || null,
            bots
        }
    }
}

/**
 * Отправляет сообщение в Telegram по произвольному chatId
 */
export async function sendMessageToChat(chatId: string | number, message: string, token: string): Promise<void> {
    if (!token) {
        console.error('[Telegram] Не настроен токен бота')
        return
    }

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('[Telegram] Ошибка API:', errorData)
        }
    } catch (error) {
        console.error('[Telegram] Не удалось отправить сообщение:', error)
    }
}

/**
 * Отправляет сообщение админу в Telegram
 * @param message - Текст сообщения (поддерживает HTML: <b>, <i>, <code>, <a>)
 */
export async function sendMessageToAdmin(message: string, eventType: TelegramBotEventType): Promise<void> {
    const config = await getTelegramConfig()

    if (!config.chatId) {
        console.error(`[Telegram] Не настроен Chat ID получателя`)
        return
    }

    // Find all bots subscribed to this event type
    const targetBots = config.bots.filter(bot =>
        bot.token && bot.enabled_events && bot.enabled_events.includes(eventType)
    )

    if (targetBots.length === 0) {
        console.error(`[Telegram] Нет ботов, настроенных для события: ${eventType}`)
        return
    }

    // Send to all matching bots
    const sends = targetBots.map(bot => {
        const chatId = bot.chat_id || config.chatId!
        return sendMessageToChat(chatId, message, bot.token)
    })

    await Promise.all(sends)
}

type InlineButton = { text: string; callback_data?: string; url?: string }

/**
 * Отправляет сообщение с inline-кнопками
 */
export async function sendMessageWithButtons(
    message: string,
    buttons: InlineButton[][],
    eventType: TelegramBotEventType
): Promise<void> {
    const config = await getTelegramConfig()

    if (!config.chatId) {
        console.error(`[Telegram] Не настроен Chat ID получателя`)
        return
    }

    const targetBots = config.bots.filter(bot =>
        bot.token && bot.enabled_events && bot.enabled_events.includes(eventType)
    )

    if (targetBots.length === 0) {
        console.error(`[Telegram] Нет ботов, настроенных для события (с кнопками): ${eventType}`)
        return
    }

    const sends = targetBots.map(async bot => {
        const chatId = bot.chat_id || config.chatId!
        try {
            const url = `https://api.telegram.org/bot${bot.token}/sendMessage`
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: { inline_keyboard: buttons }
                }),
            })
            if (!response.ok) {
                const errorData = await response.json()
                console.error('[Telegram] Ошибка API (кнопки):', errorData)
            }
        } catch (error) {
            console.error('[Telegram] Не удалось отправить сообщение (кнопки):', error)
        }
    })

    await Promise.all(sends)
}

/**
 * Уведомление о новой заявке
 */
export async function notifyNewApplication({
    name,
    phone,
    plotId,
    plotTitle,
}: {
    name: string
    phone: string
    plotId: number | string
    plotTitle?: string
}): Promise<void> {
    const message = `🔔 <b>Новая заявка!</b>

👤 <b>Имя:</b> ${escapeHtml(name)}
📞 <b>Телефон:</b> ${escapeHtml(phone)}
🏞 <b>Участок:</b> #${plotId}${plotTitle ? ` (${escapeHtml(plotTitle)})` : ''}`

    await sendMessageToAdmin(message, 'leads')
}

/**
 * Уведомление об ошибке
 */
export async function notifyAdminError(error: unknown, context: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error)

    const message = `🚨 <b>Критическая ошибка!</b>

📍 <b>Контекст:</b> ${escapeHtml(context)}
❌ <b>Ошибка:</b> <code>${escapeHtml(errorMessage)}</code>`

    await sendMessageToAdmin(message, 'errors')
}

/**
 * Уведомление о новом обратном звонке
 */
export async function notifyCallback({
    phone,
    source,
}: {
    phone: string
    source?: string
}): Promise<void> {
    const message = `📞 <b>Запрос обратного звонка!</b>

📱 <b>Телефон:</b> ${escapeHtml(phone)}${source ? `\n📍 <b>Источник:</b> ${escapeHtml(source)}` : ''}`

    await sendMessageToAdmin(message, 'callback')
}

/**
 * Экранирование HTML-символов для безопасной отправки
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}
