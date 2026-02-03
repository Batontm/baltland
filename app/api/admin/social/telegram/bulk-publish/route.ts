import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    publishPlotToTelegram,
    logSocialAction,
    recordPublishedPost
} from '@/lib/telegram-publish'

// POST: Start bulk publishing of plots
// GET: Get bulk publish status
export async function GET(request: NextRequest) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Get counts for statistics
    const [
        { count: totalPlots },
        { count: publishedCount },
        { count: errorCount },
        { count: pendingCount }
    ] = await Promise.all([
        supabase.from('land_plots').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('social_posts').select('*', { count: 'exact', head: true })
            .eq('platform', 'telegram').eq('content_type', 'plot').eq('status', 'published'),
        supabase.from('social_posts').select('*', { count: 'exact', head: true })
            .eq('platform', 'telegram').eq('content_type', 'plot').eq('status', 'error'),
        supabase.from('social_posts').select('*', { count: 'exact', head: true })
            .eq('platform', 'telegram').eq('content_type', 'plot').eq('status', 'pending')
    ])

    // Calculate unpublished
    const unpublished = (totalPlots || 0) - (publishedCount || 0)

    return NextResponse.json({
        stats: {
            total: totalPlots || 0,
            published: publishedCount || 0,
            errors: errorCount || 0,
            pending: pendingCount || 0,
            unpublished: unpublished > 0 ? unpublished : 0
        }
    })
}

export async function POST(request: NextRequest) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { limit = 10, publishAll = false } = body

        // Get settings
        const { data: settings } = await supabase
            .from('social_settings')
            .select('enabled, daily_limit')
            .eq('platform', 'telegram')
            .single()

        if (!settings?.enabled) {
            return NextResponse.json({ error: 'Telegram publishing is disabled' }, { status: 400 })
        }

        // Get already published plot IDs
        const { data: publishedPosts } = await supabase
            .from('social_posts')
            .select('content_id')
            .eq('platform', 'telegram')
            .eq('content_type', 'plot')
            .eq('status', 'published')

        const publishedIds = new Set((publishedPosts || []).map(p => p.content_id))

        // Get active plots not yet published
        const actualLimit = publishAll ? 1000 : (limit || settings.daily_limit || 10)

        const { data: plots, error } = await supabase
            .from('land_plots')
            .select('*')
            .eq('status', 'active')
            .limit(actualLimit + publishedIds.size) // Fetch extra to filter

        if (error || !plots) {
            return NextResponse.json({ error: 'Failed to fetch plots' }, { status: 500 })
        }

        // Filter out already published
        const unpublishedPlots = plots.filter(p => !publishedIds.has(p.id)).slice(0, actualLimit)

        if (unpublishedPlots.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All plots are already published',
                published: 0
            })
        }

        // Publish each plot with rate limiting
        let successCount = 0
        let errorCount = 0

        for (const plot of unpublishedPlots) {
            // Rate limit: 1 message per second for Telegram
            await new Promise(r => setTimeout(r, 1000))

            const result = await publishPlotToTelegram(plot)

            if (result.success && result.messageId) {
                await recordPublishedPost({
                    platform: 'telegram',
                    contentType: 'plot',
                    contentId: plot.id,
                    externalPostId: String(result.messageId)
                })
                successCount++
            } else {
                await supabase.from('social_posts').upsert({
                    platform: 'telegram',
                    content_type: 'plot',
                    content_id: plot.id,
                    status: 'error',
                    error_message: result.error
                }, { onConflict: 'platform,content_type,content_id' })
                errorCount++
            }
        }

        await logSocialAction({
            platform: 'telegram',
            action: 'publish',
            message: `Bulk published ${successCount} plots, ${errorCount} errors`
        })

        return NextResponse.json({
            success: true,
            published: successCount,
            errors: errorCount,
            total: unpublishedPlots.length
        })

    } catch (error) {
        console.error('[Telegram Bulk Publish API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
