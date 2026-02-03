'use client'

import { TelegramSettingsCard } from '@/components/admin/dashboard/settings/telegram-settings-card'
import { TelegramTemplatesCard } from '@/components/admin/dashboard/settings/telegram-templates-card'

export function TelegramTab() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Телеграм</h2>
            </div>

            <TelegramSettingsCard />
            <TelegramTemplatesCard />
        </div>
    )
}
