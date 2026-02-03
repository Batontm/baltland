import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import {
    Bot,
    RefreshCw,
    CheckCircle,
    XCircle,
    Loader2,
    Save,
    Eye,
    EyeOff,
    AlertTriangle,
    Plus,
    Trash2,
    MessageCircle,
    Globe,
    Link2,
    ShieldCheck
} from 'lucide-react'
import { TelegramBotConfig, TelegramBotEventType } from '@/lib/types'

interface WebhookInfo {
    url: string
    pending_update_count: number
    last_error_message?: string
}

interface BotInfo {
    id: number
    first_name: string
    username: string
}

interface TelegramConfig {
    domain: string
    adminChatId: string
    primaryBot: TelegramBotConfig | null
    bots: TelegramBotConfig[]
    twoFactorEnabled?: boolean
}

interface BotStatus {
    botInfo: BotInfo | null
    webhookInfo: WebhookInfo | null
    error?: string
}

const EVENT_LABELS: Record<TelegramBotEventType, string> = {
    leads: 'Заявки (общие)',
    viewing: 'Заявки на просмотр',
    callback: 'Обратный звонок',
    errors: 'Системные ошибки',
    faq: 'Вопросы из FAQ'
}

const DEFAULT_PRIMARY_BOT: TelegramBotConfig = {
    id: 'primary',
    name: 'Основной бот',
    token: '',
    enabled_events: ['errors']
}

export function TelegramSettingsCard() {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})
    const [botStatuses, setBotStatuses] = useState<Record<string, BotStatus>>({})
    const [settingWebhook, setSettingWebhook] = useState<string | null>(null)

    // Config form state
    const [config, setConfig] = useState<TelegramConfig>({
        domain: '',
        adminChatId: '',
        primaryBot: { ...DEFAULT_PRIMARY_BOT },
        bots: []
    })
    const [originalConfig, setOriginalConfig] = useState<TelegramConfig>({
        domain: '',
        adminChatId: '',
        primaryBot: { ...DEFAULT_PRIMARY_BOT },
        bots: []
    })

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig)

    const loadConfig = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/telegram/config')
            const json = await res.json()
            if (json.success) {
                const primaryBot = json.config?.primaryBot || {
                    ...DEFAULT_PRIMARY_BOT,
                    token: json.config?.botToken || ''
                }
                const newConfig = {
                    domain: json.config?.domain || (typeof window !== 'undefined' ? window.location.origin : ''),
                    adminChatId: json.config?.adminChatId || '',
                    primaryBot,
                    bots: Array.isArray(json.config?.bots) ? json.config.bots : []
                }
                setConfig(newConfig)
                setOriginalConfig(newConfig)

                // Set bot statuses
                if (json.botStatuses) {
                    setBotStatuses(json.botStatuses)
                }
            }
        } catch (e) {
            console.error('Failed to load telegram config:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadConfig()
    }, [])

    const handleSaveConfig = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/telegram/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            const json = await res.json()
            if (json.success) {
                setOriginalConfig(config)
                await loadConfig()
                alert('Настройки сохранены!')
            } else {
                alert(json.error || 'Ошибка сохранения')
            }
        } catch (e) {
            alert('Ошибка сохранения настроек')
        } finally {
            setSaving(false)
        }
    }

    const handleSetWebhook = async (botId: string, token: string) => {
        if (!config.domain || !token) return
        setSettingWebhook(botId)
        try {
            const webhookUrl = `${config.domain}/api/telegram/webhook`
            const res = await fetch('/api/admin/telegram/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botId, token, url: webhookUrl })
            })
            const json = await res.json()
            if (json.success) {
                await loadConfig()
            } else {
                alert(json.error || 'Ошибка установки webhook')
            }
        } finally {
            setSettingWebhook(null)
        }
    }

    const handleDeleteWebhook = async (botId: string, token: string) => {
        if (!confirm('Удалить webhook? Кнопки в уведомлениях перестанут работать.')) return
        setSettingWebhook(botId)
        try {
            const res = await fetch('/api/admin/telegram/webhook', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botId, token })
            })
            const json = await res.json()
            if (json.success) {
                await loadConfig()
            }
        } finally {
            setSettingWebhook(null)
        }
    }

    const handleTestMessage = async (botId: string, chatId?: string) => {
        try {
            const res = await fetch('/api/admin/telegram/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botId, chatId: chatId || config.adminChatId })
            })
            const json = await res.json()
            if (json.success) {
                alert('✅ Тестовое сообщение отправлено!')
            } else {
                alert('❌ Ошибка: ' + (json.error || 'Не удалось отправить'))
            }
        } catch {
            alert('❌ Ошибка отправки')
        }
    }

    const addBot = () => {
        const newBot: TelegramBotConfig = {
            id: Math.random().toString(36).substring(7),
            name: 'Новый бот',
            token: '',
            enabled_events: ['leads', 'viewing', 'callback', 'faq']
        }
        setConfig({ ...config, bots: [...config.bots, newBot] })
    }

    const removeBot = (id: string) => {
        setConfig({ ...config, bots: config.bots.filter(b => b.id !== id) })
    }

    const updateBot = (id: string, patch: Partial<TelegramBotConfig>, isPrimary = false) => {
        if (isPrimary && config.primaryBot) {
            setConfig({ ...config, primaryBot: { ...config.primaryBot, ...patch } })
        } else {
            setConfig({
                ...config,
                bots: config.bots.map(b => b.id === id ? { ...b, ...patch } : b)
            })
        }
    }

    const toggleEvent = (botId: string, event: TelegramBotEventType, isPrimary = false) => {
        const bot = isPrimary ? config.primaryBot : config.bots.find(b => b.id === botId)
        if (!bot) return
        const enabled_events = bot.enabled_events.includes(event)
            ? bot.enabled_events.filter(e => e !== event)
            : [...bot.enabled_events, event]
        updateBot(botId, { enabled_events }, isPrimary)
    }

    const toggleShowToken = (id: string) => {
        setShowTokens({ ...showTokens, [id]: !showTokens[id] })
    }

    const renderBotCard = (bot: TelegramBotConfig, isPrimary = false) => {
        const status = botStatuses[bot.id]
        const hasToken = bot.token && bot.token.length > 10
        const isSettingWebhook = settingWebhook === bot.id

        return (
            <div key={bot.id} className={`p-4 rounded-xl border space-y-4 ${isPrimary ? 'bg-emerald-50/30 border-emerald-200' : 'bg-blue-50/20'}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isPrimary ? (
                            <>
                                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">Основной</Badge>
                                <span className="font-medium text-sm">{bot.name}</span>
                            </>
                        ) : (
                            <Input
                                value={bot.name}
                                onChange={(e) => updateBot(bot.id, { name: e.target.value })}
                                className="h-8 font-medium text-sm border-none bg-transparent focus:bg-white w-auto px-1"
                            />
                        )}
                    </div>
                    {!isPrimary && (
                        <Button variant="ghost" size="sm" onClick={() => removeBot(bot.id)} className="text-red-500 h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Token */}
                <div className="space-y-2">
                    <Label className="text-xs">Токен бота</Label>
                    <div className="flex gap-2">
                        <Input
                            type={showTokens[bot.id] ? 'text' : 'password'}
                            placeholder="123456789:ABCdefGHI..."
                            value={bot.token}
                            onChange={(e) => updateBot(bot.id, { token: e.target.value }, isPrimary)}
                            className="h-8 text-xs font-mono"
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toggleShowToken(bot.id)}>
                            {showTokens[bot.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                    </div>
                </div>

                {/* Chat ID (optional for secondary bots) */}
                {!isPrimary && (
                    <div className="space-y-2">
                        <Label className="text-xs">Chat ID <span className="text-muted-foreground">(опционально, по умолчанию общий)</span></Label>
                        <Input
                            placeholder="Использовать общий Chat ID"
                            value={bot.chat_id || ''}
                            onChange={(e) => updateBot(bot.id, { chat_id: e.target.value || undefined })}
                            className="h-8 text-xs"
                        />
                    </div>
                )}

                {/* Events */}
                <div className="space-y-2">
                    <Label className="text-xs">Что отправлять на этот бот:</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-3 rounded-lg bg-white/50 border border-dashed">
                        {(Object.keys(EVENT_LABELS) as TelegramBotEventType[]).map(event => (
                            <div key={event} className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground">{EVENT_LABELS[event]}</span>
                                <Switch
                                    checked={bot.enabled_events.includes(event)}
                                    onCheckedChange={() => toggleEvent(bot.id, event, isPrimary)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bot Status */}
                {hasToken && status && (
                    <div className="space-y-3 pt-2 border-t">
                        {status.botInfo ? (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                                <span className="text-xs font-medium">{status.botInfo.first_name} (@{status.botInfo.username})</span>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Подключён
                                </Badge>
                            </div>
                        ) : status.error ? (
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <p className="text-xs text-red-600 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    {status.error}
                                </p>
                            </div>
                        ) : null}

                        {/* Webhook Status */}
                        <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                Вебхук
                            </Label>
                            {status.webhookInfo?.url ? (
                                <div className="p-2 rounded-lg bg-muted/50 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <code className="text-[9px] break-all flex-1 bg-white p-1 rounded border">{status.webhookInfo.url}</code>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground text-[10px]">Ожидающих: {status.webhookInfo.pending_update_count}</span>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteWebhook(bot.id, bot.token)}
                                            className="h-6 text-[10px] px-2"
                                            disabled={isSettingWebhook}
                                        >
                                            {isSettingWebhook ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Удалить'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                                    <span className="text-xs text-amber-600 flex items-center gap-1">
                                        <XCircle className="h-3 w-3" />
                                        Не установлен
                                    </span>
                                    <Button
                                        onClick={() => handleSetWebhook(bot.id, bot.token)}
                                        disabled={isSettingWebhook || !config.domain}
                                        size="sm"
                                        className="h-6 text-[10px] px-2"
                                    >
                                        {isSettingWebhook ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Установить'}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Test button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestMessage(bot.id, bot.chat_id)}
                            className="w-full h-7 text-xs"
                        >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Тестовое сообщение
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10">
                            <Bot className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle>Боты и уведомления</CardTitle>
                            <CardDescription>Настройки Telegram-ботов и уведомлений</CardDescription>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadConfig} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Global Settings */}
                <div className="space-y-4 p-4 rounded-xl border bg-muted/30">
                    <h3 className="font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Общие настройки Webhook
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="domain">URL сайта (для Webhook)</Label>
                            <Input
                                id="domain"
                                placeholder="https://ваша-компания.рф"
                                value={config.domain}
                                onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                                className="border-blue-200 focus:ring-blue-500"
                            />
                            <p className="text-xs text-muted-foreground">
                                Webhook Router: <code className="bg-muted px-1 rounded">{config.domain || 'https://...'}/api/telegram/webhook</code>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adminChatId">Общий Chat ID получателя</Label>
                            <Input
                                id="adminChatId"
                                placeholder="123456789"
                                value={config.adminChatId}
                                onChange={(e) => setConfig({ ...config, adminChatId: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Узнайте у <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@userinfobot</a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security Settings (2FA) */}
                <div className="space-y-4 p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                    <h3 className="font-medium flex items-center gap-2 text-blue-800">
                        <ShieldCheck className="h-4 w-4" />
                        Безопасность
                    </h3>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="2fa-toggle" className="text-base">Двухфакторная аутентификация через Telegram</Label>
                            <p className="text-sm text-muted-foreground">
                                Требовать код подтверждения из Telegram при входе в админ-панель
                            </p>
                        </div>
                        <Switch
                            id="2fa-toggle"
                            checked={config.twoFactorEnabled || false}
                            onCheckedChange={(checked) => setConfig({ ...config, twoFactorEnabled: checked })}
                        />
                    </div>
                </div>

                {/* Primary Bot */}
                {config.primaryBot && renderBotCard(config.primaryBot, true)}

                {/* Additional Bots */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center gap-2 text-sm">
                            <MessageCircle className="h-4 w-4" />
                            Дополнительные боты
                        </h3>
                        <Button variant="outline" size="sm" onClick={addBot} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Добавить бота
                        </Button>
                    </div>

                    {config.bots.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed text-center text-muted-foreground text-sm">
                            Нет дополнительных ботов. Добавьте бота для разделения уведомлений.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {config.bots.map(bot => renderBotCard(bot))}
                        </div>
                    )}
                </div>

                {/* Save Button */}
                {
                    hasChanges && (
                        <Button onClick={handleSaveConfig} disabled={saving} className="w-full gap-2 py-6 text-lg rounded-xl">
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            Сохранить все настройки
                        </Button>
                    )
                }

                {/* Commands Reference */}
                {
                    config.primaryBot?.token && (
                        <div className="space-y-3">
                            <Label>Доступные команды</Label>
                            <div className="p-4 rounded-xl bg-muted/50 space-y-2 text-sm">
                                <div><code>/search Поддубное</code> — найти участки в посёлке</div>
                                <div><code>/plot [id]</code> — информация об участке</div>
                                <div><code>/stats</code> — статистика за сегодня</div>
                                <div><code>/help</code> — справка по командам</div>
                            </div>
                        </div>
                    )
                }

                {/* Not configured state */}
                {
                    !config.primaryBot?.token && !config.bots.length && (
                        <Alert>
                            <Bot className="h-4 w-4" />
                            <AlertDescription>
                                Добавьте токен основного бота для начала работы
                            </AlertDescription>
                        </Alert>
                    )
                }
            </CardContent >
        </Card >
    )
}
