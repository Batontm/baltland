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

        // Extract publish_time from nested settings JSON if present
        const result = data || {
            platform: 'vk',
            enabled: false,
            daily_limit: 10,
            auto_delete_sold: true,
            settings: {}
        }
        
        // Flatten publish_time from settings JSON to top level for frontend
        if (result.settings?.publish_time) {
            result.publish_time = result.settings.publish_time
        } else {
            result.publish_time = '10:00'
        }
        
        return NextResponse.json(result)
    } catch (error) {
        console.error('[VK Settings API] Error:', error)
        return NextResponse.json({
            platform: 'vk',
            enabled: false,
            daily_limit: 10,
            auto_delete_sold: true,
            publish_time: '10:00'
        })
    }
}

// POST: Update VK settings
export async function POST(request: NextRequest) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { enabled, daily_limit, auto_delete_sold, publish_time } = body

        // First get current settings to preserve other fields in settings JSON
        const { data: current } = await supabase
            .from('social_settings')
            .select('settings')
            .eq('platform', 'vk')
            .single()

        const currentSettings = current?.settings || {}
        
        // Update settings JSON with new publish_time
        const updatedSettings = {
            ...currentSettings,
            publish_time: publish_time || '10:00'
        }

        const { data, error } = await supabase
            .from('social_settings')
            .upsert({
                platform: 'vk',
                enabled: enabled ?? false,
                daily_limit: daily_limit || 10,
                auto_delete_sold: auto_delete_sold ?? true,
                settings: updatedSettings,
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
            message: `Настройки обновлены: ${enabled ? 'вкл' : 'выкл'}, лимит: ${daily_limit}/день, время: ${publish_time || '10:00'}`
        })

        return NextResponse.json({ success: true, settings: data })
    } catch (error) {
        console.error('[VK Settings API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
