import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteTelegramMessage, logSocialAction } from '@/lib/telegram-publish'

// POST: Sync Telegram posts with DB (delete posts for sold/deleted plots)
export async function POST() {
    const supabase = createAdminClient()

    try {
        // Get settings
        const { data: settings } = await supabase
            .from('social_settings')
            .select('auto_delete_sold')
            .eq('platform', 'telegram')
            .single()

        if (!settings?.auto_delete_sold) {
            return NextResponse.json({
                message: 'Auto-delete is disabled',
                deleted: 0
            })
        }

        // Get all published posts for plots
        const { data: publishedPosts } = await supabase
            .from('social_posts')
            .select('id, content_id, external_post_id')
            .eq('platform', 'telegram')
            .eq('content_type', 'plot')
            .eq('status', 'published')

        if (!publishedPosts || publishedPosts.length === 0) {
            return NextResponse.json({ message: 'No published posts to sync', deleted: 0 })
        }

        // Get all active/existing plot IDs
        const plotIds = publishedPosts.map(p => p.content_id)
        const { data: existingPlots } = await supabase
            .from('land_plots')
            .select('id, status')
            .in('id', plotIds)

        const existingActiveIds = new Set(
            (existingPlots || [])
                .filter(p => p.status === 'active')
                .map(p => p.id)
        )

        // Find posts to delete (plot deleted or not active)
        const postsToDelete = publishedPosts.filter(p => !existingActiveIds.has(p.content_id))

        let deletedCount = 0

        for (const post of postsToDelete) {
            if (post.external_post_id) {
                const messageId = parseInt(post.external_post_id)
                const deleted = await deleteTelegramMessage(messageId)

                if (deleted) {
                    deletedCount++
                }
            }

            // Mark as deleted in DB
            await supabase
                .from('social_posts')
                .update({
                    status: 'deleted',
                    deleted_at: new Date().toISOString()
                })
                .eq('id', post.id)
        }

        if (deletedCount > 0) {
            await logSocialAction({
                platform: 'telegram',
                action: 'sync',
                message: `Synced: deleted ${deletedCount} posts for sold/removed plots`
            })
        }

        return NextResponse.json({
            success: true,
            checked: publishedPosts.length,
            deleted: deletedCount,
            toDelete: postsToDelete.length
        })

    } catch (error) {
        console.error('[Telegram Sync API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
