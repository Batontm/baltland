import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// This endpoint should be called by a cron job every minute
// It checks if it's time to publish and runs the auto-publish if enabled

export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    try {
        // Get VK settings
        const { data: settings, error: settingsError } = await supabase
            .from('social_settings')
            .select('*')
            .eq('platform', 'vk')
            .single()

        if (settingsError || !settings) {
            return NextResponse.json({ message: 'No VK settings found' })
        }

        if (!settings.enabled) {
            return NextResponse.json({ message: 'Auto-publish is disabled' })
        }

        // Get publish_time from settings JSON
        const publishTime = settings.settings?.publish_time || '10:00'
        
        // Get current time in Kaliningrad timezone (UTC+2)
        const now = new Date()
        const kaliningradTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kaliningrad' }))
        const currentHour = kaliningradTime.getHours().toString().padStart(2, '0')
        const currentMinute = kaliningradTime.getMinutes().toString().padStart(2, '0')
        const currentTime = `${currentHour}:${currentMinute}`

        // Check if it's time to publish (within 1 minute window)
        const [targetHour, targetMinute] = publishTime.split(':')
        const isPublishTime = currentHour === targetHour && currentMinute === targetMinute

        if (!isPublishTime) {
            return NextResponse.json({ 
                message: 'Not publish time yet',
                currentTime,
                targetTime: publishTime
            })
        }

        // Check if already published today
        const today = new Date().toISOString().split('T')[0]
        const lastPublish = settings.last_auto_publish_at 
            ? new Date(settings.last_auto_publish_at).toISOString().split('T')[0]
            : null

        if (lastPublish === today) {
            return NextResponse.json({ 
                message: 'Already published today',
                lastPublish
            })
        }

        const dailyLimit = settings.daily_limit || 10

        // Get already published plot IDs
        const { data: publishedPosts } = await supabase
            .from('social_posts')
            .select('plot_id')
            .eq('platform', 'vk')
            .in('status', ['published', 'pending'])

        const publishedIds = new Set((publishedPosts || []).map(p => p.plot_id).filter(Boolean))

        // Get active plots not yet published
        const { data: plots, error: plotsError } = await supabase
            .from('land_plots')
            .select('id, title, cadastral_number')
            .eq('is_active', true)
            .is('bundle_id', null)
            .order('created_at', { ascending: false })
            .limit(dailyLimit + publishedIds.size)

        if (plotsError) {
            return NextResponse.json({ 
                message: 'Database error',
                error: plotsError.message
            }, { status: 500 })
        }

        // Filter out already published
        const unpublishedPlots = (plots || []).filter(p => !publishedIds.has(p.id)).slice(0, dailyLimit)

        if (unpublishedPlots.length === 0) {
            return NextResponse.json({ 
                message: 'No plots to publish - all are already published',
                totalPlots: plots?.length || 0,
                alreadyPublished: publishedIds.size
            })
        }

        // Call bulk-publish API internally
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://baltland.ru'
        const publishResponse = await fetch(`${baseUrl}/api/admin/social/vk/bulk-publish`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authHeader || ''
            },
            body: JSON.stringify({ limit: dailyLimit })
        })

        const publishResult = await publishResponse.json()

        // Update last_auto_publish_at
        await supabase
            .from('social_settings')
            .update({ last_auto_publish_at: new Date().toISOString() })
            .eq('platform', 'vk')

        // Log the auto-publish
        await supabase.from('social_logs').insert({
            platform: 'vk',
            action: 'auto_publish',
            message: `Автопубликация: ${publishResult.published || 0} участков опубликовано в ${currentTime}`
        })

        return NextResponse.json({
            success: true,
            message: 'Auto-publish completed',
            published: publishResult.published || 0,
            errors: publishResult.errors || 0,
            time: currentTime
        })

    } catch (error: any) {
        console.error('[VK Auto-Publish] Error:', error)
        
        // Log the error
        await supabase.from('social_logs').insert({
            platform: 'vk',
            action: 'error',
            message: `Ошибка автопубликации: ${error.message}`
        })

        return NextResponse.json({ 
            error: 'Auto-publish failed',
            message: error.message 
        }, { status: 500 })
    }
}

// Also support POST for manual trigger
export async function POST(request: NextRequest) {
    return GET(request)
}
