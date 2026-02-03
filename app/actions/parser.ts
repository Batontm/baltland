'use server'

import type { ParseResult } from '@/lib/news-parser-types'
import { DEFAULT_RSS_FEEDS } from '@/lib/rss-feeds'
import { parseNewsByKeywords } from '@/lib/parser'
import { revalidatePath } from 'next/cache'

/**
 * Server Action для парсинга новостей по ключевым словам
 */
export async function parseNewsAction(keywords: string[]): Promise<ParseResult> {
    try {
        const result = await parseNewsByKeywords(keywords)

        // Обновляем кэш страницы новостей
        if (result.added > 0) {
            revalidatePath('/admin')
        }

        return result
    } catch (error) {
        console.error('[parseNewsAction] Error:', error)
        return {
            success: false,
            added: 0,
            skipped: 0,
            errors: [error instanceof Error ? error.message : 'Неизвестная ошибка'],
            items: []
        }
    }
}

export async function parseNewsActionWithFeeds(keywords: string[], feedIds: string[]): Promise<ParseResult> {
    try {
        const normalizedIds = new Set((feedIds || []).map((v) => String(v || '').trim()).filter(Boolean))
        const feeds = DEFAULT_RSS_FEEDS.filter((f) => normalizedIds.has(f.id))

        const result = await parseNewsByKeywords(keywords, feeds)

        if (result.added > 0) {
            revalidatePath('/admin')
        }

        return result
    } catch (error) {
        console.error('[parseNewsActionWithFeeds] Error:', error)
        return {
            success: false,
            added: 0,
            skipped: 0,
            errors: [error instanceof Error ? error.message : 'Неизвестная ошибка'],
            items: []
        }
    }
}
