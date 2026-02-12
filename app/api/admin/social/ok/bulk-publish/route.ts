import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishPlotToOK, OKRateLimiter } from '@/lib/ok-api'

const rateLimiter = new OKRateLimiter()

// POST: Bulk publish plots to OK
export async function POST(request: NextRequest) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { limit = 10, publishAll = false } = body

        // Get already published plot IDs to OK
        const { data: publishedPosts } = await supabase
            .from('social_posts')
            .select('plot_id')
            .eq('platform', 'ok')
            .in('status', ['published', 'pending'])

        const publishedIds = new Set((publishedPosts || []).map(p => p.plot_id).filter(Boolean))

        // Get active plots not yet published
        const actualLimit = publishAll ? 500 : limit

        const { data: plots, error } = await supabase
            .from('land_plots')
            .select('*')
            .eq('is_active', true)
            .is('bundle_id', null)
            .order('created_at', { ascending: false })
            .limit(actualLimit + publishedIds.size)

        if (error) {
            console.error('[OK Bulk Publish] DB Error:', error)
            return NextResponse.json({ error: 'Failed to fetch plots: ' + error.message }, { status: 500 })
        }

        if (!plots || plots.length === 0) {
            return NextResponse.json({ error: 'No plots found in database' }, { status: 404 })
        }

        // Filter out already published
        const unpublishedPlots = plots.filter(p => !publishedIds.has(p.id)).slice(0, actualLimit)

        if (unpublishedPlots.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All plots are already published to OK',
                published: 0
            })
        }

        // Publish each plot with rate limiting
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const plot of unpublishedPlots) {
            await rateLimiter.wait()

            try {
                // Prepare plot data with correct image URL
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://baltland.ru"
                const imageSource = plot.map_image_url || plot.image_url
                const imageUrl = imageSource
                    ? (imageSource.startsWith("http") ? imageSource : `${baseUrl}${imageSource}`)
                    : undefined

                const plotToPublish = {
                    ...plot,
                    image_url: imageUrl
                }

                const result = await publishPlotToOK(plotToPublish)

                // Check if post already exists
                const { data: existingPost } = await supabase
                    .from('social_posts')
                    .select('id')
                    .eq('platform', 'ok')
                    .eq('plot_id', plot.id)
                    .single()

                if (existingPost) {
                    await supabase
                        .from('social_posts')
                        .update({
                            external_id: result.topicId,
                            external_url: result.url,
                            status: 'published',
                            published_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            error_message: null
                        })
                        .eq('id', existingPost.id)
                } else {
                    await supabase.from('social_posts').insert({
                        platform: 'ok',
                        plot_id: plot.id,
                        post_type: 'topic',
                        external_id: result.topicId,
                        external_url: result.url,
                        status: 'published',
                        published_at: new Date().toISOString()
                    })
                }

                successCount++
            } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : 'Unknown error'
                errors.push(`${plot.cadastral_number}: ${errMsg}`)

                // Record error
                const { data: existingPost } = await supabase
                    .from('social_posts')
                    .select('id')
                    .eq('platform', 'ok')
                    .eq('plot_id', plot.id)
                    .single()

                if (existingPost) {
                    await supabase
                        .from('social_posts')
                        .update({
                            status: 'error',
                            error_message: errMsg,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingPost.id)
                } else {
                    await supabase.from('social_posts').insert({
                        platform: 'ok',
                        plot_id: plot.id,
                        post_type: 'topic',
                        status: 'error',
                        error_message: errMsg
                    })
                }

                errorCount++
            }
        }

        // Log the action
        await supabase.from('social_logs').insert({
            platform: 'ok',
            action: 'publish',
            message: `Массовая публикация OK: ${successCount} успешно, ${errorCount} ошибок`,
            metadata: errors.length > 0 ? { errors: errors.slice(0, 10) } : null
        })

        return NextResponse.json({
            success: true,
            published: successCount,
            errors: errorCount,
            total: unpublishedPlots.length,
            errorDetails: errors.slice(0, 5)
        })

    } catch (error: unknown) {
        console.error('[OK Bulk Publish API] Error:', error)
        const errMsg = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ error: errMsg }, { status: 500 })
    }
}
