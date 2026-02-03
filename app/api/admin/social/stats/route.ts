import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: Get aggregated stats for all platforms
export async function GET() {
    const supabase = createAdminClient()

    try {
        // Get counts for VK (using existing schema with plot_id)
        const [totalPlotsRes, vkPublishedRes, vkErrorsRes, vkDeletedRes] = await Promise.all([
            supabase.from('land_plots').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'vk').eq('status', 'published'),
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'vk').eq('status', 'error'),
            supabase.from('social_posts').select('*', { count: 'exact', head: true })
                .eq('platform', 'vk').eq('status', 'deleted')
        ])

        const total = totalPlotsRes.count || 0
        const published = vkPublishedRes.count || 0
        const errors = vkErrorsRes.count || 0
        const deleted = vkDeletedRes.count || 0

        return NextResponse.json({
            plots: {
                total,
                vk: {
                    published,
                    errors,
                    deleted,
                    unpublished: Math.max(0, total - published)
                }
            }
        })
    } catch (error) {
        console.error('[Social Stats API] Error:', error)
        return NextResponse.json({
            error: 'Failed to fetch stats',
            plots: { total: 0, vk: { published: 0, errors: 0, deleted: 0, unpublished: 0 } }
        }, { status: 500 })
    }
}
