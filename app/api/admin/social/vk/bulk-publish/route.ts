import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishPlotToVK, VKRateLimiter } from '@/lib/vk-api'

const rateLimiter = new VKRateLimiter()

// POST: Bulk publish plots to VK
export async function POST(request: NextRequest) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { limit = 10, publishAll = false } = body

        // Get already published plot IDs
        const { data: publishedPosts } = await supabase
            .from('social_posts')
            .select('plot_id')
            .eq('platform', 'vk')
            .in('status', ['published', 'pending'])

        const publishedIds = new Set((publishedPosts || []).map(p => p.plot_id).filter(Boolean))

        // Get active plots not yet published
        // Include: standalone plots (no bundle_id) + primary bundle plots
        const actualLimit = publishAll ? 500 : limit

        const { data: standalonePlots, error: err1 } = await supabase
            .from('land_plots')
            .select('*')
            .eq('is_active', true)
            .is('bundle_id', null)
            .order('created_at', { ascending: false })
            .limit(actualLimit + publishedIds.size)

        const { data: bundlePrimaryPlots, error: err2 } = await supabase
            .from('land_plots')
            .select('*')
            .eq('is_active', true)
            .not('bundle_id', 'is', null)
            .eq('is_bundle_primary', true)
            .order('created_at', { ascending: false })
            .limit(actualLimit + publishedIds.size)

        if (err1 || err2) {
            const errMsg = (err1 || err2)!.message
            console.error('[VK Bulk Publish] DB Error:', errMsg)
            return NextResponse.json({ error: 'Failed to fetch plots: ' + errMsg }, { status: 500 })
        }

        const plots = [...(standalonePlots || []), ...(bundlePrimaryPlots || [])]

        if (plots.length === 0) {
            return NextResponse.json({ error: 'No plots found in database' }, { status: 404 })
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

                const plotToPublish: Record<string, any> = {
                    ...plot,
                    image_url: imageUrl
                }

                // Enrich bundle plots with member info
                if (plot.bundle_id) {
                    const { data: members } = await supabase
                        .from('land_plots')
                        .select('cadastral_number, area_sotok')
                        .eq('bundle_id', plot.bundle_id)
                        .eq('is_active', true)
                        .order('cadastral_number', { ascending: true })

                    if (members && members.length > 1) {
                        plotToPublish.bundleMembers = members.map((m: any) => ({
                            cadastral_number: m.cadastral_number || '',
                            area_sotok: Number(m.area_sotok) || 0,
                        }))
                        plotToPublish.bundleTotalArea = members.reduce((sum: number, m: any) => sum + (Number(m.area_sotok) || 0), 0)
                        plotToPublish.bundleCount = members.length
                    }
                }

                const result = await publishPlotToVK(plotToPublish as any)

                // Check if post already exists (update) or insert new
                const { data: existingPost } = await supabase
                    .from('social_posts')
                    .select('id')
                    .eq('platform', 'vk')
                    .eq('plot_id', plot.id)
                    .single()

                if (existingPost) {
                    // Update existing
                    await supabase
                        .from('social_posts')
                        .update({
                            external_id: String(result.postId),
                            external_url: result.url,
                            status: 'published',
                            published_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            error_message: null
                        })
                        .eq('id', existingPost.id)
                } else {
                    // Insert new
                    await supabase.from('social_posts').insert({
                        platform: 'vk',
                        plot_id: plot.id,
                        post_type: 'wall',
                        external_id: String(result.postId),
                        external_url: result.url,
                        status: 'published',
                        published_at: new Date().toISOString()
                    })
                }

                successCount++
            } catch (err: any) {
                const errMsg = err.message || 'Unknown error'
                errors.push(`${plot.cadastral_number}: ${errMsg}`)

                // Check if error record exists
                const { data: existingPost } = await supabase
                    .from('social_posts')
                    .select('id')
                    .eq('platform', 'vk')
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
                        platform: 'vk',
                        plot_id: plot.id,
                        post_type: 'wall',
                        status: 'error',
                        error_message: errMsg
                    })
                }

                errorCount++
            }
        }

        // Log the action
        await supabase.from('social_logs').insert({
            platform: 'vk',
            action: 'publish',
            message: `Массовая публикация: ${successCount} успешно, ${errorCount} ошибок`,
            metadata: errors.length > 0 ? { errors: errors.slice(0, 10) } : null
        })

        return NextResponse.json({
            success: true,
            published: successCount,
            errors: errorCount,
            total: unpublishedPlots.length,
            errorDetails: errors.slice(0, 5)
        })

    } catch (error: any) {
        console.error('[VK Bulk Publish API] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
