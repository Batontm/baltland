"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, FileText, AlertTriangle } from "lucide-react"
import type { OrganizationSettings } from "@/lib/types"

interface PlotDescriptionSettingsCardProps {
    orgSettings: OrganizationSettings
    loadingSettings: boolean
    onChange: (patch: Partial<OrganizationSettings>) => void
    onSave: (data: Partial<OrganizationSettings>) => void
}

const DEFAULT_DISCLAIMER = `❗ Важно о деталях:
В нашей базе более 2000 участков, поэтому в описании могут быть неточности касательно текущего состояния подъездных путей или коммуникаций. Информация носит справочный характер и не является публичной офертой (ст. 437 ГК РФ).
Стоимость и параметры могут меняться. Чтобы избежать недоразумений, пожалуйста, уточните актуальные нюансы у менеджера перед просмотром.`

export function PlotDescriptionSettingsCard({
    orgSettings,
    loadingSettings,
    onChange,
    onSave,
}: PlotDescriptionSettingsCardProps) {
    const disclaimer = orgSettings.plot_description_disclaimer ?? DEFAULT_DISCLAIMER

    const handleSave = () => {
        onSave({ plot_description_disclaimer: disclaimer })
    }

    return (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                    Глобальный дисклеймер для ВСЕХ участков
                </CardTitle>
                <CardDescription className="text-amber-700">
                    Этот текст отображается на странице каждого участка
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert variant="destructive" className="bg-amber-100 border-amber-300 text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Внимание!</strong> Этот дисклеймер добавляется ко ВСЕМ участкам на сайте.
                        Изменения сразу отразятся на всех страницах объявлений.
                    </AlertDescription>
                </Alert>

                <div className="space-y-2">
                    <Label htmlFor="plot_disclaimer" className="text-amber-800 font-semibold">
                        Текст дисклеймера
                    </Label>
                    <Textarea
                        id="plot_disclaimer"
                        value={disclaimer}
                        onChange={(e) => onChange({ plot_description_disclaimer: e.target.value })}
                        rows={7}
                        placeholder="Введите текст дисклеймера..."
                        className="font-mono text-sm bg-white border-amber-200"
                    />
                    <p className="text-xs text-amber-700">
                        Этот текст автоматически добавляется в конец описания каждого участка.
                        Он отображается в выделенном блоке с серым фоном.
                    </p>
                </div>

                <Button onClick={handleSave} disabled={loadingSettings} className="gap-2 bg-amber-600 hover:bg-amber-700">
                    <Save className="h-4 w-4" />
                    Сохранить дисклеймер
                </Button>
            </CardContent>
        </Card>
    )
}
