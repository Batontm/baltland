import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildPlotSlug } from '@/lib/utils'
import { TelegramBotConfig } from '@/lib/types'

const SITE_URL = "https://baltland.ru"
const TELEGRAM_API = 'https://api.telegram.org/bot'

// Cache for admin chat ID from database
let cachedAdminChatId: string | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60000 // 1 minute

async function getAdminChatId(): Promise<string | null> {
    const now = Date.now()
    if (cachedAdminChatId && (now - cacheTimestamp) < CACHE_TTL) {
        return cachedAdminChatId
    }

    try {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('organization_settings')
            .select('telegram_admin_chat_id')
            .single()

        cachedAdminChatId = data?.telegram_admin_chat_id || process.env.ADMIN_CHAT_ID || null
        cacheTimestamp = now
        return cachedAdminChatId
    } catch {
        return process.env.ADMIN_CHAT_ID || null
    }
}

async function getTokenFromDb(botId: string | null): Promise<string | null> {
    const supabase = createAdminClient()
    const { data: settings } = await supabase
        .from('organization_settings')
        .select('telegram_bot_token, telegram_bots')
        .single()

    if (!botId || botId === 'primary') {
        const bots: TelegramBotConfig[] = Array.isArray(settings?.telegram_bots) ? settings.telegram_bots : []
        const primaryBot = bots.find(b => b.id === 'primary')
        return primaryBot?.token || settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || null
    }

    const bots: TelegramBotConfig[] = Array.isArray(settings?.telegram_bots) ? settings.telegram_bots : []
    const bot = bots.find(b => b.id === botId)
    return bot?.token || null
}

interface TelegramUpdate {
    update_id: number
    message?: {
        message_id: number
        from: { id: number; first_name: string }
        chat: { id: number }
        text?: string
        reply_to_message?: {
            message_id: number
            text?: string
        }
    }
    callback_query?: {
        id: string
        from: { id: number; first_name: string }
        message: { chat: { id: number }; message_id: number }
        data: string
    }
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const botId = searchParams.get('botId')

        const botToken = await getTokenFromDb(botId)
        if (!botToken) {
            console.error(`[Telegram Webhook] No token found for botId: ${botId}`)
            return NextResponse.json({ ok: false, error: 'Token not found' }, { status: 404 })
        }

        const update: TelegramUpdate = await request.json()
        console.log(`[Telegram Webhook] New update for botId ${botId}:`, JSON.stringify(update))

        if (update.callback_query) {
            await handleCallback(update.callback_query, botToken)
            return NextResponse.json({ ok: true })
        }

        if (update.message?.text) {
            await handleMessage(update.message, botToken)
        } else if (update.message?.reply_to_message) {
            // Processing non-text replies (like photos) if needed, but handleMessage usually covers text
            await handleMessage(update.message, botToken)
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[Telegram Webhook] Main handler error:', error)
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}

async function handleCallback(callback: NonNullable<TelegramUpdate['callback_query']>, botToken: string) {
    const { data, id: callbackId, message } = callback
    const chatId = message.chat.id

    await answerCallback(callbackId, botToken)

    const [action, ...params] = data.split(':')

    switch (action) {
        case 'kp':
            await sendPlotDetails(chatId, params[0], botToken)
            break
        case 'location':
            await sendPlotsByLocation(chatId, params.join(':'), botToken)
            break
        case 'done':
            await markLeadAsDone(params[0], chatId, botToken)
            break
    }
}

async function handleMessage(message: NonNullable<TelegramUpdate['message']>, botToken: string) {
    const text = message.text || ''
    const chatId = message.chat.id

    if (text.startsWith('/start ')) {
        const code = text.replace('/start ', '').trim()
        if (!code) {
            await sendMessage(chatId, 'Введите код после /start', botToken)
            return
        }

        const supabase = createAdminClient()
        const { data: link, error } = await supabase
            .from('admin_telegram_link_codes')
            .select('id, admin_user_id, expires_at, used_at')
            .eq('code', code)
            .limit(1)

        if (error || !link || link.length === 0) {
            await sendMessage(chatId, '❌ Неверный код', botToken)
            return
        }

        const row: any = link[0]
        if (row.used_at) {
            await sendMessage(chatId, '❌ Код уже использован', botToken)
            return
        }

        const expiresAt = new Date(row.expires_at).getTime()
        if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
            await sendMessage(chatId, '❌ Код истёк. Запросите новый в форме входа.', botToken)
            return
        }

        const { error: updUserErr } = await supabase
            .from('admin_users')
            .update({ telegram_chat_id: String(chatId) })
            .eq('id', row.admin_user_id)

        if (updUserErr) {
            await sendMessage(chatId, '❌ Ошибка привязки. Попробуйте позже.', botToken)
            return
        }

        await supabase
            .from('admin_telegram_link_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('id', row.id)

        await sendMessage(chatId, '✅ Telegram успешно привязан. Теперь войдите в админку.', botToken)
        return
    }

    const adminChatId = await getAdminChatId()
    if (!adminChatId || String(chatId) !== adminChatId) {
        // Only allow chat replies even if not main admin? 
        // No, typically chat replies are from admins.
        if (!message.reply_to_message) {
            await sendMessage(chatId, '⛔ Доступ запрещён', botToken)
            return
        }
    }

    if (text.startsWith('/search ')) {
        const location = text.replace('/search ', '').trim()
        await sendPlotsByLocation(chatId, location, botToken)
        return
    }

    if (text.startsWith('/plot ')) {
        const plotId = text.replace('/plot ', '').trim()
        await sendPlotDetails(chatId, plotId, botToken)
        return
    }

    if (text === '/stats') {
        await sendStats(chatId, botToken)
        return
    }

    if (text === '/help' || text === '/start') {
        await sendMessage(chatId, `🏠 <b>Бот управления участками</b>\n\n<b>Команды:</b>\n/search Поддубное\n/plot 123\n/stats`, botToken)
        return
    }

    if (message.reply_to_message) {
        await handleChatReply(message, botToken)
    }
}

async function handleChatReply(message: NonNullable<TelegramUpdate['message']>, botToken: string) {
    const replyTo = message.reply_to_message!
    const text = message.text || ''

    const supabase = createAdminClient()

    const { data: originalMsg, error: findError } = await supabase
        .from('chat_messages')
        .select('session_id')
        .eq('telegram_message_id', replyTo.message_id)
        .single()

    if (findError || !originalMsg) {
        console.error('[handleChatReply] Original message not found:', findError)
        return
    }

    await supabase.from('chat_messages').insert({
        session_id: originalMsg.session_id,
        text,
        sender: 'admin'
    })

    console.log(`[handleChatReply] Saved admin response to session ${originalMsg.session_id}`)
}

async function sendPlotsByLocation(chatId: number, location: string, botToken: string) {
    const supabase = createAdminClient()
    const { data: plots } = await supabase
        .from('land_plots')
        .select('id, title, location, price, area_sotok, cadastral_number')
        .ilike('location', `%${location}%`)
        .eq('is_active', true)
        .limit(10)

    if (!plots || plots.length === 0) {
        await sendMessage(chatId, `❌ Участки в "${location}" не найдены`, botToken)
        return
    }

    let msg = `🏘 <b>Участки: ${location}</b>\n\n`
    plots.forEach((p, i) => {
        msg += `${i + 1}. ${p.area_sotok} сот. - ${p.price ? (p.price / 1000000).toFixed(1) + ' млн' : '—'}\n`
    })

    const keyboard = plots.map(p => [{ text: `КП: ${p.id}`, callback_data: `kp:${p.id}` }])
    await sendMessage(chatId, msg, botToken, keyboard)
}

async function sendPlotDetails(chatId: number, plotId: string, botToken: string) {
    const supabase = createAdminClient()
    const { data: plot } = await supabase.from('land_plots').select('*').eq('id', plotId).single()
    if (!plot) return

    const msg = `🏞 <b>${plot.title}</b>\n💰 ${plot.price?.toLocaleString()} ₽\n📍 ${plot.location}`
    if (plot.image_url) {
        await sendPhoto(chatId, plot.image_url, msg, botToken)
    } else {
        await sendMessage(chatId, msg, botToken)
    }
}

async function markLeadAsDone(leadId: string, chatId: number, botToken: string) {
    const supabase = createAdminClient()
    const { error } = await supabase.from('leads').update({ status: 'processed' }).eq('id', leadId)
    if (!error) await sendMessage(chatId, `✅ Заявка #${leadId.slice(0, 8)} обработана`, botToken)
}

async function sendStats(chatId: number, botToken: string) {
    const supabase = createAdminClient()
    const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true })
    await sendMessage(chatId, `📊 Всего заявок: ${count}`, botToken)
}

async function sendMessage(chatId: number, text: string, botToken: string, keyboard?: any) {
    const body: any = { chat_id: chatId, text, parse_mode: 'HTML' }
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard }
    await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
}

async function sendPhoto(chatId: number, photoUrl: string, caption: string, botToken: string) {
    await fetch(`${TELEGRAM_API}${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' })
    })
}

async function answerCallback(callbackId: string, botToken: string) {
    await fetch(`${TELEGRAM_API}${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId })
    })
}
