import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteGroupTopic } from '@/lib/ok-api'

// POST: Sync OK posts with DB (delete posts for sold/deleted plots)
export async function POST() {
    const supabase = createAdminClient()

    try {
        // Get all published posts for OK
        const { data: publishedPosts } = await supabase
            .from('social_posts')
            .select('id, plot_id, external_id')
            .eq('platform', 'ok')
            .eq('status', 'published')

        if (!publishedPosts || publishedPosts.length === 0) {
            return NextResponse.json({ message: 'No published OK posts to sync', deleted: 0, checked: 0 })
        }

        // Get all active/existing plot IDs
        const plotIds = publishedPosts.map(p => p.plot_id).filter(Boolean)
        const { data: existingPlots } = await supabase
            .from('land_plots')
            .select('id, is_active')
            .in('id', plotIds)

        const existingActiveIds = new Set(
            (existingPlots || [])
                .filter(p => p.is_active === true)
                .map(p => p.id)
        )

        // Find posts to delete (plot deleted or not active)
        const postsToDelete = publishedPosts.filter(p => p.plot_id && !existingActiveIds.has(p.plot_id))

        let deletedCount = 0

        for (const post of postsToDelete) {
            if (post.external_id) {
                try {
                    const deleted = await deleteGroupTopic(post.external_id)
                    if (deleted) {
                        deletedCount++
                    }
                } catch (error) {
                    console.error(`Failed to delete OK post ${post.external_id}:`, error)
                }
            }

            // Mark as deleted in DB
            await supabase
                .from('social_posts')
                .update({
                    status: 'deleted',
                    updated_at: new Date().toISOString()
                })
                .eq('id', post.id)
        }

        // Log the sync action
        if (postsToDelete.length > 0) {
            await supabase.from('social_logs').insert({
                platform: 'ok',
                action: 'sync',
                message: `Синхронизация OK: удалено ${deletedCount} постов (продано/удалено ${postsToDelete.length} участков)`
            })
        }

        return NextResponse.json({
            success: true,
            checked: publishedPosts.length,
            deleted: deletedCount,
            toDelete: postsToDelete.length
        })

    } catch (error) {
        console.error('[OK Sync API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
