import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: Get aggregated stats for all platforms
export async function GET() {
    const supabase = createAdminClient()

    try {
        // Get counts for VK and OK
        const [
            totalPlotsRes,
            vkPublishedRes, vkErrorsRes, vkDeletedRes,
            okPublishedRes, okErrorsRes, okDeletedRes
        ] = await Promise.all([
            supabase.from('land_plots').select('*', { count: 'exact', head: true }).eq('is_active', true),
            // VK stats
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'vk').eq('status', 'published'),
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'vk').eq('status', 'error'),
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'vk').eq('status', 'deleted'),
            // OK stats
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'ok').eq('status', 'published'),
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'ok').eq('status', 'error'),
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'ok').eq('status', 'deleted')
        ])

        const total = totalPlotsRes.count || 0
        const vkPublished = vkPublishedRes.count || 0
        const okPublished = okPublishedRes.count || 0

        return NextResponse.json({
            plots: {
                total,
                vk: {
                    published: vkPublished,
                    errors: vkErrorsRes.count || 0,
                    deleted: vkDeletedRes.count || 0,
                    unpublished: Math.max(0, total - vkPublished)
                },
                ok: {
                    published: okPublished,
                    errors: okErrorsRes.count || 0,
                    deleted: okDeletedRes.count || 0,
                    unpublished: Math.max(0, total - okPublished)
                }
            }
        })
    } catch (error) {
        console.error('[Social Stats API] Error:', error)
        return NextResponse.json({
            error: 'Failed to fetch stats',
            plots: {
                total: 0,
                vk: { published: 0, errors: 0, deleted: 0, unpublished: 0 },
                ok: { published: 0, errors: 0, deleted: 0, unpublished: 0 }
            }
        }, { status: 500 })
    }
}
