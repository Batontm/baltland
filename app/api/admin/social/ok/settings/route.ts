import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: Get OK settings
export async function GET() {
    const supabase = createAdminClient()

    try {
        const { data, error } = await supabase
            .from('social_settings')
            .select('*')
            .eq('platform', 'ok')
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('[OK Settings API] Error:', error)
        }

        const result = data || {
            platform: 'ok',
            enabled: false,
            daily_limit: 10,
            auto_delete_sold: true,
            settings: {}
        }

        // Flatten publish_time from settings JSON
        if (result.settings?.publish_time) {
            result.publish_time = result.settings.publish_time
        } else {
            result.publish_time = '12:00'
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('[OK Settings API] Error:', error)
        return NextResponse.json({
            platform: 'ok',
            enabled: false,
            daily_limit: 10,
            auto_delete_sold: true,
            publish_time: '12:00'
        })
    }
}

// POST: Update OK settings
export async function POST(request: NextRequest) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { enabled, daily_limit, auto_delete_sold, publish_time } = body

        // Get current settings
        const { data: current } = await supabase
            .from('social_settings')
            .select('settings')
            .eq('platform', 'ok')
            .single()

        const currentSettings = current?.settings || {}

        const updatedSettings = {
            ...currentSettings,
            publish_time: publish_time || '12:00'
        }

        const { data, error } = await supabase
            .from('social_settings')
            .upsert({
                platform: 'ok',
                enabled: enabled ?? false,
                daily_limit: daily_limit || 10,
                auto_delete_sold: auto_delete_sold ?? true,
                settings: updatedSettings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'platform' })
            .select()
            .single()

        if (error) {
            console.error('[OK Settings API] Update error:', error)
            return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
        }

        // Log the change
        await supabase.from('social_logs').insert({
            platform: 'ok',
            action: 'settings',
            message: `Настройки OK обновлены: ${enabled ? 'вкл' : 'выкл'}, лимит: ${daily_limit}/день, время: ${publish_time || '12:00'}`
        })

        return NextResponse.json({ success: true, settings: data })
    } catch (error) {
        console.error('[OK Settings API] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
