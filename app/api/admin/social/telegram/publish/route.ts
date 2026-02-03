import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    publishPlotToTelegram,
    publishNewsToTelegram,
    logSocialAction,
    recordPublishedPost
} from '@/lib/telegram-publish'

// POST: Publish a single plot or news to Telegram
export async function POST(request: NextRequest) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { contentType, contentId } = body

        if (!contentType || !contentId) {
            return NextResponse.json({ error: 'Missing contentType or contentId' }, { status: 400 })
        }

        // Check if already published
        const { data: existing } = await supabase
            .from('social_posts')
            .select('id, status')
            .eq('platform', 'telegram')
            .eq('content_type', contentType)
            .eq('content_id', contentId)
            .eq('status', 'published')
            .single()

        if (existing) {
            return NextResponse.json({ error: 'Already published to Telegram' }, { status: 400 })
        }

        let result

        if (contentType === 'plot') {
            // Fetch plot data
            const { data: plot, error } = await supabase
                .from('land_plots')
                .select('*')
                .eq('id', contentId)
                .single()

            if (error || !plot) {
                return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
            }

            result = await publishPlotToTelegram(plot)

        } else if (contentType === 'news') {
            // Fetch news data
            const { data: news, error } = await supabase
                .from('news')
                .select('*')
                .eq('id', contentId)
                .single()

            if (error || !news) {
                return NextResponse.json({ error: 'News not found' }, { status: 404 })
            }

            result = await publishNewsToTelegram(news)

        } else {
            return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 })
        }

        if (result.success && result.messageId) {
            // Record successful publish
            await recordPublishedPost({
                platform: 'telegram',
                contentType,
                contentId,
                externalPostId: String(result.messageId)
            })

            await logSocialAction({
                platform: 'telegram',
                action: 'publish',
                contentType,
                contentId,
                message: `Published ${contentType} ${contentId} (msg: ${result.messageId})`
            })

            return NextResponse.json({
                success: true,
                messageId: result.messageId
            })
        } else {
            // Record error
            await supabase.from('social_posts').upsert({
                platform: 'telegram',
                content_type: contentType,
                content_id: contentId,
                status: 'error',
                error_message: result.error
            }, { onConflict: 'platform,content_type,content_id' })

            await logSocialAction({
                platform: 'telegram',
                action: 'error',
                contentType,
                contentId,
                message: result.error || 'Unknown error'
            })

            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 })
        }

    } catch (error) {
        console.error('[Telegram Publish API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
