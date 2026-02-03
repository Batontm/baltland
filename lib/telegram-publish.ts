/**
 * Telegram Publishing API
 * Functions for publishing land plots and news to Telegram channels
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { LandPlot } from '@/lib/types'

interface TelegramPublishConfig {
    botToken: string
    channelId: string
}

interface PublishResult {
    success: boolean
    messageId?: number
    error?: string
}

/**
 * Get Telegram publishing settings from DB
 */
export async function getTelegramPublishConfig(): Promise<TelegramPublishConfig | null> {
    const supabase = createAdminClient()

    const { data, error } = await supabase
        .from('social_settings')
        .select('bot_token, channel_id, enabled')
        .eq('platform', 'telegram')
        .single()

    if (error || !data || !data.enabled || !data.bot_token || !data.channel_id) {
        return null
    }

    return {
        botToken: data.bot_token,
        channelId: data.channel_id
    }
}

/**
 * Format land plot data for Telegram post
 */
export function formatPlotMessage(plot: LandPlot): string {
    const lines: string[] = []

    // Title with emoji
    lines.push(`🏞 <b>${escapeHtml(plot.title || 'Земельный участок')}</b>`)
    lines.push('')

    // Location
    if (plot.location) {
        lines.push(`📍 ${escapeHtml(plot.location)}${plot.district ? `, ${escapeHtml(plot.district)}` : ''}`)
    }

    // Cadastral number
    if (plot.cadastral_number) {
        lines.push(`📋 Кадастр: <code>${escapeHtml(plot.cadastral_number)}</code>`)
    }

    // Area
    if (plot.area_sotok) {
        lines.push(`📐 Площадь: ${plot.area_sotok} сот.`)
    }

    // Price
    if (plot.price && plot.price > 0) {
        const formattedPrice = new Intl.NumberFormat('ru-RU').format(plot.price)
        lines.push(`💰 Цена: <b>${formattedPrice} ₽</b>`)
    }

    // Communications
    const comms: string[] = []
    if (plot.has_electricity) comms.push('⚡️ Электричество')
    if (plot.has_gas) comms.push('🔥 Газ')
    if (plot.has_water) comms.push('💧 Вода')

    if (comms.length > 0) {
        lines.push('')
        lines.push(comms.join(' | '))
    }

    // Link to site
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://baltland.ru'
    lines.push('')
    lines.push(`🔗 <a href="${siteUrl}/catalog/${plot.id}">Подробнее на сайте</a>`)

    return lines.join('\n')
}

/**
 * Send photo with caption to Telegram channel
 */
async function sendPhotoToChannel(
    config: TelegramPublishConfig,
    photoUrl: string,
    caption: string
): Promise<PublishResult> {
    try {
        const url = `https://api.telegram.org/bot${config.botToken}/sendPhoto`

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.channelId,
                photo: photoUrl,
                caption: caption,
                parse_mode: 'HTML'
            })
        })

        const data = await response.json()

        if (!data.ok) {
            return { success: false, error: data.description || 'Unknown Telegram error' }
        }

        return { success: true, messageId: data.result.message_id }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Network error' }
    }
}

/**
 * Send text message to Telegram channel
 */
async function sendMessageToChannel(
    config: TelegramPublishConfig,
    text: string
): Promise<PublishResult> {
    try {
        const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.channelId,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            })
        })

        const data = await response.json()

        if (!data.ok) {
            return { success: false, error: data.description || 'Unknown Telegram error' }
        }

        return { success: true, messageId: data.result.message_id }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Network error' }
    }
}

/**
 * Publish a land plot to Telegram channel
 */
export async function publishPlotToTelegram(plot: LandPlot): Promise<PublishResult> {
    const config = await getTelegramPublishConfig()

    if (!config) {
        return { success: false, error: 'Telegram publishing not configured' }
    }

    const message = formatPlotMessage(plot)

    // If plot has an image, send as photo with caption
    if (plot.image_url) {
        return sendPhotoToChannel(config, plot.image_url, message)
    }

    // Otherwise send text message
    return sendMessageToChannel(config, message)
}

/**
 * Publish news to Telegram channel
 */
export async function publishNewsToTelegram(news: {
    id: string
    title: string
    content: string
    image_url?: string
}): Promise<PublishResult> {
    const config = await getTelegramPublishConfig()

    if (!config) {
        return { success: false, error: 'Telegram publishing not configured' }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://baltland.ru'

    const lines = [
        `📰 <b>${escapeHtml(news.title)}</b>`,
        '',
        escapeHtml(news.content.slice(0, 500)) + (news.content.length > 500 ? '...' : ''),
        '',
        `🔗 <a href="${siteUrl}/news/${news.id}">Читать полностью</a>`
    ]

    const message = lines.join('\n')

    if (news.image_url) {
        return sendPhotoToChannel(config, news.image_url, message)
    }

    return sendMessageToChannel(config, message)
}

/**
 * Delete a message from Telegram channel
 */
export async function deleteTelegramMessage(messageId: number): Promise<boolean> {
    const config = await getTelegramPublishConfig()

    if (!config) {
        console.error('[Telegram Publish] Not configured')
        return false
    }

    try {
        const url = `https://api.telegram.org/bot${config.botToken}/deleteMessage`

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.channelId,
                message_id: messageId
            })
        })

        const data = await response.json()
        return data.ok === true
    } catch (error) {
        console.error('[Telegram Publish] Delete error:', error)
        return false
    }
}

/**
 * Log a social media action
 */
export async function logSocialAction(params: {
    platform: 'telegram' | 'vk'
    action: 'publish' | 'delete' | 'error' | 'sync'
    contentType?: 'plot' | 'news'
    contentId?: string
    message: string
    metadata?: Record<string, unknown>
}): Promise<void> {
    const supabase = createAdminClient()

    await supabase.from('social_logs').insert({
        platform: params.platform,
        action: params.action,
        content_type: params.contentType,
        content_id: params.contentId,
        message: params.message,
        metadata: params.metadata
    })
}

/**
 * Record a published post
 */
export async function recordPublishedPost(params: {
    platform: 'telegram' | 'vk'
    contentType: 'plot' | 'news'
    contentId: string
    externalPostId: string
    externalUrl?: string
}): Promise<void> {
    const supabase = createAdminClient()

    await supabase.from('social_posts').upsert({
        platform: params.platform,
        content_type: params.contentType,
        content_id: params.contentId,
        external_post_id: params.externalPostId,
        external_url: params.externalUrl,
        status: 'published',
        published_at: new Date().toISOString()
    }, {
        onConflict: 'platform,content_type,content_id'
    })
}

/**
 * Escape HTML for Telegram
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}
