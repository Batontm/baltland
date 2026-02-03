import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - Load templates
export async function GET() {
    const supabase = createAdminClient()

    const { data: settings, error } = await supabase
        .from('organization_settings')
        .select('telegram_template_new_lead, telegram_template_viewing, telegram_template_error')
        .single()

    if (error) {
        return NextResponse.json({ success: false, error: error.message })
    }

    return NextResponse.json({
        success: true,
        templates: {
            newLead: settings?.telegram_template_new_lead || null,
            viewing: settings?.telegram_template_viewing || null,
            error: settings?.telegram_template_error || null
        }
    })
}

// POST - Save templates
export async function POST(request: NextRequest) {
    try {
        const { newLead, viewing, error: errorTemplate } = await request.json()

        const supabase = createAdminClient()

        const { error } = await supabase
            .from('organization_settings')
            .update({
                telegram_template_new_lead: newLead || null,
                telegram_template_viewing: viewing || null,
                telegram_template_error: errorTemplate || null
            })
            .not('id', 'is', null)

        if (error) {
            console.error('[Telegram Templates] Error saving:', error)
            return NextResponse.json({ success: false, error: 'Ошибка сохранения: ' + error.message })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Telegram Templates] Error:', error)
        return NextResponse.json({ success: false, error: 'Ошибка сохранения шаблонов' })
    }
}
