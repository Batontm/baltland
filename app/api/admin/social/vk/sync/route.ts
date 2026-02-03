import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteWallPost } from '@/lib/vk-api'

// POST: Sync VK posts with DB (delete posts for sold/deleted plots)
export async function POST() {
    const supabase = createAdminClient()

    try {
        // Get all published posts for plots (use plot_id - existing schema)
        const { data: publishedPosts } = await supabase
            .from('social_posts')
            .select('id, plot_id, external_id')
            .eq('platform', 'vk')
            .eq('status', 'published')

        if (!publishedPosts || publishedPosts.length === 0) {
            return NextResponse.json({ message: 'No published posts to sync', deleted: 0, checked: 0 })
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
                const postId = parseInt(post.external_id)
                try {
                    const deleted = await deleteWallPost(postId)
                    if (deleted) {
                        deletedCount++
                    }
                } catch (error) {
                    console.error(`Failed to delete VK post ${postId}:`, error)
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
                platform: 'vk',
                action: 'sync',
                message: `Синхронизация: удалено ${deletedCount} постов (продано/удалено ${postsToDelete.length} участков)`
            })
        }

        return NextResponse.json({
            success: true,
            checked: publishedPosts.length,
            deleted: deletedCount,
            toDelete: postsToDelete.length
        })

    } catch (error) {
        console.error('[VK Sync API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
