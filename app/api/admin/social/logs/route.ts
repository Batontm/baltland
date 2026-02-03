import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: Fetch social media logs
export async function GET(request: NextRequest) {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const platform = searchParams.get('platform') || 'telegram'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: logs, error, count } = await supabase
        .from('social_logs')
        .select('*', { count: 'exact' })
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs, total: count })
}
