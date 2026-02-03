'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Save, Loader2, RotateCcw, Copy, Info } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface Templates {
    newLead: string
    viewing: string
    error: string
}

// Default templates
const DEFAULT_TEMPLATES: Templates = {
    newLead: `🔔 <b>Новая заявка!</b>

👤 <b>Имя:</b> {name}
📞 <b>Телефон:</b> {phone}
{messengers}

💬 <b>Пожелания:</b> {wishes}`,

    viewing: `🔔 <b>Новая заявка на просмотр!</b>

👤 <b>Имя:</b> {name}
📞 <b>Телефон:</b> {phone}
{messengers}

🏞 <b>Участок:</b> {location}
📍 <b>Кадастр:</b> {cadastral_link}
💰 <b>Цена:</b> {price} {area}

📲 <b>Быстрая связь:</b>
• <a href="{whatsapp_link}">WhatsApp</a>
• <a href="{call_link}">Позвонить</a>
• <a href="{max_link}">MAX</a>`,

    error: `🚨 <b>Критическая ошибка!</b>

📍 <b>Контекст:</b> {context}
❌ <b>Ошибка:</b> <code>{error_message}</code>`
}

// Available variables for each template type
const TEMPLATE_VARIABLES: Record<keyof Templates, { name: string; description: string }[]> = {
    newLead: [
        { name: '{name}', description: 'Имя клиента' },
        { name: '{phone}', description: 'Телефон' },
        { name: '{wishes}', description: 'Пожелания клиента' },
        { name: '{messengers}', description: 'Предпочтительные мессенджеры' },
    ],
    viewing: [
        { name: '{name}', description: 'Имя клиента' },
        { name: '{phone}', description: 'Телефон' },
        { name: '{messengers}', description: 'Мессенджеры' },
        { name: '{location}', description: 'Расположение участка' },
        { name: '{cadastral}', description: 'Кадастровый номер' },
        { name: '{cadastral_link}', description: 'Кадастр со ссылкой на карту' },
        { name: '{price}', description: 'Цена (напр. 1.5 млн ₽)' },
        { name: '{area}', description: 'Площадь (напр. 15 сот.)' },
        { name: '{whatsapp_link}', description: 'Ссылка на WhatsApp' },
        { name: '{call_link}', description: 'Ссылка для звонка' },
        { name: '{max_link}', description: 'Ссылка на MAX' },
    ],
    error: [
        { name: '{context}', description: 'Контекст ошибки' },
        { name: '{error_message}', description: 'Текст ошибки' },
    ]
}

export function TelegramTemplatesCard() {
    const [templates, setTemplates] = useState<Templates>(DEFAULT_TEMPLATES)
    const [originalTemplates, setOriginalTemplates] = useState<Templates>(DEFAULT_TEMPLATES)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const hasChanges = JSON.stringify(templates) !== JSON.stringify(originalTemplates)

    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/telegram/templates')
            const json = await res.json()
            if (json.success && json.templates) {
                const loadedTemplates = {
                    newLead: json.templates.newLead || DEFAULT_TEMPLATES.newLead,
                    viewing: json.templates.viewing || DEFAULT_TEMPLATES.viewing,
                    error: json.templates.error || DEFAULT_TEMPLATES.error
                }
                setTemplates(loadedTemplates)
                setOriginalTemplates(loadedTemplates)
            }
        } catch (e) {
            console.error('Failed to load templates:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/telegram/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templates)
            })
            const json = await res.json()
            if (json.success) {
                setOriginalTemplates(templates)
                alert('Шаблоны сохранены!')
            } else {
                alert(json.error || 'Ошибка сохранения')
            }
        } catch (e) {
            alert('Ошибка сохранения шаблонов')
        } finally {
            setSaving(false)
        }
    }

    const handleReset = (key: keyof Templates) => {
        setTemplates({ ...templates, [key]: DEFAULT_TEMPLATES[key] })
    }

    const copyVariable = (variable: string) => {
        navigator.clipboard.writeText(variable)
    }

    const renderTemplateEditor = (
        key: keyof Templates,
        title: string,
        description: string
    ) => (
        <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-base font-medium">{title}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(key)}
                    title="Сбросить к стандартному"
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>

            <Textarea
                value={templates[key]}
                onChange={(e) => setTemplates({ ...templates, [key]: e.target.value })}
                className="min-h-[150px] font-mono text-sm"
                placeholder="Введите шаблон..."
            />

            <div className="flex flex-wrap gap-1">
                <TooltipProvider>
                    {TEMPLATE_VARIABLES[key].map((v) => (
                        <Tooltip key={v.name}>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => copyVariable(v.name)}
                                >
                                    {v.name}
                                    <Copy className="h-3 w-3 ml-1" />
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{v.description}</p>
                                <p className="text-xs text-muted-foreground">Клик — скопировать</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </TooltipProvider>
            </div>
        </div>
    )

    if (loading) {
        return (
            <Card className="rounded-2xl">
                <CardContent className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Загрузка шаблонов...
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10">
                            <MessageSquare className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <CardTitle>Шаблоны сообщений</CardTitle>
                            <CardDescription>Настройте тексты уведомлений с переменными</CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-sm">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-blue-700">Как использовать переменные</p>
                        <p className="text-muted-foreground">
                            Вставляйте переменные в фигурных скобках, например <code>{'{name}'}</code>.
                            Они автоматически заменятся на реальные данные при отправке.
                        </p>
                    </div>
                </div>

                {renderTemplateEditor(
                    'newLead',
                    '📋 Новая заявка',
                    'Отправляется при создании общей заявки'
                )}

                {renderTemplateEditor(
                    'viewing',
                    '🏠 Заявка на просмотр',
                    'Отправляется при заявке на просмотр участка'
                )}

                {renderTemplateEditor(
                    'error',
                    '🚨 Уведомление об ошибке',
                    'Отправляется при критических ошибках'
                )}

                {hasChanges && (
                    <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Сохранить шаблоны
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
