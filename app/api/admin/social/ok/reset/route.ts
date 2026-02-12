import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST: Reset OK published posts counter
export async function POST() {
    const supabase = createAdminClient()

    try {
        // Count before deletion
        const { count: beforeCount } = await supabase
            .from('social_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'ok')

        // Delete all OK posts
        const { error } = await supabase
            .from('social_posts')
            .delete()
            .eq('platform', 'ok')

        if (error) {
            console.error('[OK Reset API] Delete error:', error)
            return NextResponse.json({ error: 'Failed to reset posts' }, { status: 500 })
        }

        // Log the action
        await supabase.from('social_logs').insert({
            platform: 'ok',
            action: 'reset',
            message: `Счётчик OK сброшен: удалено ${beforeCount || 0} записей`
        })

        return NextResponse.json({
            success: true,
            deleted: beforeCount || 0
        })

    } catch (error) {
        console.error('[OK Reset API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
