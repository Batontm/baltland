import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: Get VK settings
export async function GET() {
    const supabase = createAdminClient()

    try {
        const { data, error } = await supabase
            .from('social_settings')
            .select('*')
            .eq('platform', 'vk')
            .single()

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is ok
            console.error('[VK Settings API] Error:', error)
        }

        return NextResponse.json(data || {
            platform: 'vk',
            enabled: false,
            daily_limit: 10,
            auto_delete_sold: true
        })
    } catch (error) {
        console.error('[VK Settings API] Error:', error)
        return NextResponse.json({
            platform: 'vk',
            enabled: false,
            daily_limit: 10,
            auto_delete_sold: true
        })
    }
}

// POST: Update VK settings
export async function POST(request: NextRequest) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { enabled, daily_limit, auto_delete_sold } = body

        const { data, error } = await supabase
            .from('social_settings')
            .upsert({
                platform: 'vk',
                enabled: enabled ?? false,
                daily_limit: daily_limit || 10,
                auto_delete_sold: auto_delete_sold ?? true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'platform' })
            .select()
            .single()

        if (error) {
            console.error('[VK Settings API] Update error:', error)
            return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
        }

        // Log the change
        await supabase.from('social_logs').insert({
            platform: 'vk',
            action: 'settings',
            message: `Настройки обновлены: ${enabled ? 'вкл' : 'выкл'}, лимит: ${daily_limit}/день`
        })

        return NextResponse.json({ success: true, settings: data })
    } catch (error) {
        console.error('[VK Settings API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
