import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishPlotToOK, OKRateLimiter } from '@/lib/ok-api'

const rateLimiter = new OKRateLimiter()

// Cron job for auto-publishing to OK
export async function GET() {
    const supabase = createAdminClient()

    try {
        // Check if OK is enabled
        const { data: settings } = await supabase
            .from('social_settings')
            .select('*')
            .eq('platform', 'ok')
            .single()

        if (!settings?.enabled) {
            return NextResponse.json({ message: 'OK auto-publish is disabled' })
        }

        const dailyLimit = settings.daily_limit || 10

        // Get already published plot IDs
        const { data: publishedPosts } = await supabase
            .from('social_posts')
            .select('plot_id')
            .eq('platform', 'ok')
            .in('status', ['published', 'pending'])

        const publishedIds = new Set((publishedPosts || []).map(p => p.plot_id).filter(Boolean))

        // Get active plots not yet published
        const { data: plots } = await supabase
            .from('land_plots')
            .select('*')
            .eq('is_active', true)
            .is('bundle_id', null)
            .order('created_at', { ascending: false })
            .limit(dailyLimit + publishedIds.size)

        if (!plots || plots.length === 0) {
            return NextResponse.json({ message: 'No plots to publish' })
        }

        const unpublishedPlots = plots.filter(p => !publishedIds.has(p.id)).slice(0, dailyLimit)

        if (unpublishedPlots.length === 0) {
            return NextResponse.json({ message: 'All plots already published to OK' })
        }

        let successCount = 0
        let errorCount = 0

        for (const plot of unpublishedPlots) {
            await rateLimiter.wait()

            try {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://baltland.ru"
                const imageSource = plot.map_image_url || plot.image_url
                const imageUrl = imageSource
                    ? (imageSource.startsWith("http") ? imageSource : `${baseUrl}${imageSource}`)
                    : undefined

                const result = await publishPlotToOK({ ...plot, image_url: imageUrl })

                await supabase.from('social_posts').insert({
                    platform: 'ok',
                    plot_id: plot.id,
                    post_type: 'topic',
                    external_id: result.topicId,
                    external_url: result.url,
                    status: 'published',
                    published_at: new Date().toISOString()
                })

                successCount++
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : 'Unknown error'

                await supabase.from('social_posts').insert({
                    platform: 'ok',
                    plot_id: plot.id,
                    post_type: 'topic',
                    status: 'error',
                    error_message: errMsg
                })

                errorCount++
            }
        }

        // Log the action
        await supabase.from('social_logs').insert({
            platform: 'ok',
            action: 'auto-publish',
            message: `Автопубликация OK: ${successCount} успешно, ${errorCount} ошибок`
        })

        return NextResponse.json({
            success: true,
            published: successCount,
            errors: errorCount
        })

    } catch (error) {
        console.error('[OK Cron] Error:', error)
        return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
    }
}
