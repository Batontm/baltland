import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST: Reset published posts count (delete all VK posts records)
export async function POST() {
    const supabase = createAdminClient()

    try {
        // Count before delete
        const { count: beforeCount } = await supabase
            .from('social_posts')
            .select('*', { count: 'exact', head: true })
            .eq('platform', 'vk')

        // Delete all VK posts records
        const { error } = await supabase
            .from('social_posts')
            .delete()
            .eq('platform', 'vk')

        if (error) {
            console.error('[VK Reset API] Error:', error)
            return NextResponse.json({ error: 'Failed to reset: ' + error.message }, { status: 500 })
        }

        // Log the action
        await supabase.from('social_logs').insert({
            platform: 'vk',
            action: 'reset',
            message: `Сброс счётчика: удалено ${beforeCount || 0} записей о публикациях`
        })

        return NextResponse.json({
            success: true,
            deleted: beforeCount || 0
        })

    } catch (error: any) {
        console.error('[VK Reset API] Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
