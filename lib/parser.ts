/**
 * RSS News Parser
 * Парсит новости из RSS-лент по ключевым словам
 */

import 'server-only'

import Parser from 'rss-parser'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RssFeed } from '@/lib/rss-feeds'
import { DEFAULT_RSS_FEEDS } from '@/lib/rss-feeds'
import type { ParseResult, ParsedNewsItem } from '@/lib/news-parser-types'

const parser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
    }
})

async function fetchRssXml(url: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
                'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
            redirect: 'follow',
            signal: controller.signal,
        })
        if (!response.ok) {
            throw new Error(`Status code ${response.status}`)
        }
        return await response.text()
    } finally {
        clearTimeout(timeoutId)
    }
}

export type { ParseResult, ParsedNewsItem }

/**
 * Проверяет, содержит ли текст одно из ключевых слов
 */
function containsKeyword(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase()
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
}

/**
 * Извлекает URL изображения из контента или описания
 */
function extractImageUrl(item: Parser.Item): string | null {
    // Проверяем enclosure
    if (item.enclosure?.url) {
        return item.enclosure.url
    }

    // Проверяем media:content
    const mediaContent = (item as unknown as Record<string, unknown>)['media:content']
    if (mediaContent && typeof mediaContent === 'object' && 'url' in (mediaContent as object)) {
        return (mediaContent as { url: string }).url
    }

    // Ищем img в контенте
    const content = item.content || item.contentSnippet || ''
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (imgMatch) {
        return imgMatch[1]
    }

    return null
}

/**
 * Очищает HTML-теги из текста
 */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Загружает полный текст статьи по URL
 */
async function fetchFullArticleContent(url: string): Promise<string | null> {
    if (!url) return null

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'ru-RU,ru;q=0.9'
            },
            signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!response.ok) return null

        const html = await response.text()

        // Ищем основной контент статьи
        // Пробуем разные селекторы для разных сайтов
        const articlePatterns = [
            /<article[^>]*>([\s\S]*?)<\/article>/i,
            /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<main[^>]*>([\s\S]*?)<\/main>/i,
        ]

        for (const pattern of articlePatterns) {
            const match = html.match(pattern)
            if (match && match[1]) {
                // Извлекаем параграфы
                const paragraphs = match[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi)
                if (paragraphs && paragraphs.length > 0) {
                    const text = paragraphs
                        .map(p => stripHtml(p))
                        .filter(p => p.length > 50) // Фильтруем короткие строки
                        .join('\n\n')

                    if (text.length > 200) {
                        return text.substring(0, 5000) // Ограничиваем длину
                    }
                }
            }
        }

        // Если ничего не нашли, пробуем собрать все параграфы
        const allParagraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi)
        if (allParagraphs && allParagraphs.length > 3) {
            const text = allParagraphs
                .map(p => stripHtml(p))
                .filter(p => p.length > 50)
                .slice(0, 20) // Берём первые 20 параграфов
                .join('\n\n')

            if (text.length > 200) {
                return text.substring(0, 5000)
            }
        }

        return null
    } catch (error) {
        console.error(`[Parser] Error fetching article ${url}:`, error)
        return null
    }
}

/**
 * Парсит новости из RSS-лент по ключевым словам
 */
export async function parseNewsByKeywords(keywords: string[], feeds?: RssFeed[]): Promise<ParseResult> {
    const supabase = createAdminClient()
    const result: ParseResult = {
        success: true,
        added: 0,
        skipped: 0,
        errors: [],
        items: []
    }

    if (keywords.length === 0) {
        result.success = false
        result.errors.push('Не указаны ключевые слова')
        return result
    }

    // Получаем существующие URLs для проверки дубликатов
    const { data: existingNews } = await supabase
        .from('news')
        .select('title')

    const existingTitles = new Set((existingNews || []).map(n => n.title.toLowerCase()))

    const selectedFeeds = (feeds && feeds.length > 0 ? feeds : DEFAULT_RSS_FEEDS).filter(f => {
        try {
            const u = new URL(f.url)
            return u.protocol === 'https:' || u.protocol === 'http:'
        } catch {
            return false
        }
    })

    // Парсим каждую ленту
    for (const feed of selectedFeeds) {
        try {
            console.log(`[Parser] Parsing feed: ${feed.name}`)
            const xml = await fetchRssXml(feed.url)
            const feedData = await parser.parseString(xml)

            for (const item of feedData.items || []) {
                const title = item.title || ''
                const description = item.contentSnippet || item.content || ''

                // Проверяем ключевые слова
                if (!containsKeyword(title, keywords) && !containsKeyword(description, keywords)) {
                    continue
                }

                // Проверяем дубликат по заголовку
                if (existingTitles.has(title.toLowerCase())) {
                    result.skipped++
                    continue
                }

                // Пытаемся загрузить полный текст статьи
                const articleUrl = item.link || ''
                let fullContent = await fetchFullArticleContent(articleUrl)

                // Если не удалось загрузить полный текст, используем описание из RSS
                if (!fullContent || fullContent.length < 100) {
                    fullContent = stripHtml(description)
                }

                const newsItem: ParsedNewsItem = {
                    title: stripHtml(title),
                    content: fullContent.substring(0, 5000), // Ограничиваем длину
                    link: articleUrl,
                    pubDate: item.pubDate || item.isoDate || null,
                    source: feed.name,
                    imageUrl: extractImageUrl(item)
                }

                // Сохраняем в БД как черновик
                const { error } = await supabase
                    .from('news')
                    .insert({
                        title: newsItem.title,
                        content: `${newsItem.content}\n\n📰 Источник: ${newsItem.source}${newsItem.link ? ` — <a href="${newsItem.link}">читать оригинал</a>` : ''}`,
                        image_url: newsItem.imageUrl,
                        is_published: false, // Черновик
                    })

                if (error) {
                    result.errors.push(`Ошибка сохранения "${newsItem.title.substring(0, 30)}...": ${error.message}`)
                } else {
                    result.added++
                    result.items.push(newsItem)
                    existingTitles.add(title.toLowerCase()) // Добавляем в Set для предотвращения дублей в текущей сессии
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
            result.errors.push(`Ошибка парсинга ${feed.name}: ${errorMessage}`)
            console.error(`[Parser] Error parsing ${feed.name}:`, err)
        }
    }

    console.log(`[Parser] Done. Added: ${result.added}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`)

    return result
}
