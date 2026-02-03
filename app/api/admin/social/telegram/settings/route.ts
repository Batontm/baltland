import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: Fetch Telegram settings
// POST: Update Telegram settings
export async function GET() {
    const supabase = createAdminClient()

    const { data, error } = await supabase
        .from('social_settings')
        .select('*')
        .eq('platform', 'telegram')
        .single()

    if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data || { platform: 'telegram', enabled: false } })
}

export async function POST(request: NextRequest) {
    const supabase = createAdminClient()

    try {
        const body = await request.json()
        const { enabled, daily_limit, channel_id, bot_token, auto_delete_sold } = body

        const { data, error } = await supabase
            .from('social_settings')
            .upsert({
                platform: 'telegram',
                enabled: enabled ?? false,
                daily_limit: daily_limit ?? 10,
                channel_id: channel_id || null,
                bot_token: bot_token || null,
                auto_delete_sold: auto_delete_sold ?? true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'platform' })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ settings: data })
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
}
