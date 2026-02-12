'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import {
    Send,
    RefreshCw,
    BarChart3,
    ScrollText,
    CheckCircle,
    XCircle,
    Loader2,
    Trash2,
    Play,
    Pause,
    Settings2,
    RotateCcw
} from 'lucide-react'

interface Stats {
    total: number
    published: number
    errors: number
    unpublished: number
    deleted: number
}

interface LogEntry {
    id: string
    platform: string
    action: string
    message: string
    created_at: string
}

interface AutoPublishSettings {
    enabled: boolean
    dailyLimit: number
    autoDeleteSold: boolean
    publishTime: string
}

export function SocialNetworksTab() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [resetting, setResetting] = useState(false)
    const [publishCount, setPublishCount] = useState(10)

    // Auto-publish settings
    const [autoSettings, setAutoSettings] = useState<AutoPublishSettings>({
        enabled: false,
        dailyLimit: 10,
        autoDeleteSold: true,
        publishTime: '10:00'
    })
    const [savingSettings, setSavingSettings] = useState(false)

    const { toast } = useToast()

    useEffect(() => {
        loadData()
        loadSettings()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [statsRes, logsRes] = await Promise.all([
                fetch('/api/admin/social/stats'),
                fetch('/api/admin/social/logs?platform=vk&limit=20')
            ])

            if (statsRes.ok) {
                const data = await statsRes.json()
                if (data.plots?.vk) {
                    setStats({
                        total: data.plots.total || 0,
                        ...data.plots.vk
                    })
                } else {
                    setStats({
                        total: data.plots?.total || 0,
                        published: 0,
                        errors: 0,
                        unpublished: data.plots?.total || 0,
                        deleted: 0
                    })
                }
            }

            if (logsRes.ok) {
                const { logs: l } = await logsRes.json()
                setLogs(l || [])
            }
        } catch (error) {
            console.error('Failed to load data:', error)
            toast({ title: 'Ошибка загрузки данных', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/admin/social/vk/settings')
            if (res.ok) {
                const data = await res.json()
                setAutoSettings({
                    enabled: data.enabled || false,
                    dailyLimit: data.daily_limit || 10,
                    autoDeleteSold: data.auto_delete_sold ?? true,
                    publishTime: data.publish_time || '10:00'
                })
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
        }
    }

    const saveSettings = async () => {
        setSavingSettings(true)
        try {
            const res = await fetch('/api/admin/social/vk/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: autoSettings.enabled,
                    daily_limit: autoSettings.dailyLimit,
                    auto_delete_sold: autoSettings.autoDeleteSold,
                    publish_time: autoSettings.publishTime
                })
            })

            if (res.ok) {
                toast({ title: 'Настройки сохранены' })
            } else {
                throw new Error('Failed to save')
            }
        } catch (error) {
            toast({ title: 'Ошибка сохранения', variant: 'destructive' })
        } finally {
            setSavingSettings(false)
        }
    }

    const startBulkPublish = async (publishAll = false) => {
        setPublishing(true)
        try {
            const res = await fetch('/api/admin/social/vk/bulk-publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: publishAll ? 500 : publishCount,
                    publishAll
                })
            })

            const data = await res.json()

            if (res.ok) {
                toast({
                    title: 'Публикация завершена',
                    description: `Опубликовано: ${data.published}, ошибок: ${data.errors}`
                })
                loadData()
            } else {
                throw new Error(data.error || 'Failed')
            }
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error.message,
                variant: 'destructive'
            })
        } finally {
            setPublishing(false)
        }
    }

    const runSync = async () => {
        setSyncing(true)
        try {
            const res = await fetch('/api/admin/social/vk/sync', { method: 'POST' })
            const data = await res.json()

            toast({
                title: 'Синхронизация',
                description: `Проверено: ${data.checked || 0}, удалено: ${data.deleted || 0}`
            })
            loadData()
        } catch {
            toast({ title: 'Ошибка синхронизации', variant: 'destructive' })
        } finally {
            setSyncing(false)
        }
    }

    const resetPublishedCount = async () => {
        if (!confirm('Сбросить счётчик опубликованных? Все записи о публикациях будут удалены.')) {
            return
        }

        setResetting(true)
        try {
            const res = await fetch('/api/admin/social/vk/reset', { method: 'POST' })
            const data = await res.json()

            if (res.ok) {
                toast({
                    title: 'Счётчик сброшен',
                    description: `Удалено записей: ${data.deleted || 0}`
                })
                loadData()
            } else {
                throw new Error(data.error || 'Failed')
            }
        } catch (error: any) {
            toast({ title: 'Ошибка сброса', description: error.message, variant: 'destructive' })
        } finally {
            setResetting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Cap progress at 100%
    const vkProgress = stats && stats.total > 0
        ? Math.min(100, Math.round((stats.published / stats.total) * 100))
        : 0

    return (
        <div className="space-y-6">
            {/* Auto-publish Settings */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Settings2 className="h-5 w-5" />
                                Автопубликация
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Ежедневная публикация новых участков в указанное время
                            </CardDescription>
                        </div>
                        <Switch
                            checked={autoSettings.enabled}
                            onCheckedChange={async (checked) => {
                                setAutoSettings(prev => ({ ...prev, enabled: checked }))
                                // Auto-save on toggle
                                setSavingSettings(true)
                                try {
                                    await fetch('/api/admin/social/vk/settings', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            enabled: checked,
                                            daily_limit: autoSettings.dailyLimit,
                                            auto_delete_sold: autoSettings.autoDeleteSold,
                                            publish_time: autoSettings.publishTime
                                        })
                                    })
                                    toast({ title: checked ? 'Автопубликация включена' : 'Автопубликация выключена' })
                                } catch {
                                    toast({ title: 'Ошибка сохранения', variant: 'destructive' })
                                } finally {
                                    setSavingSettings(false)
                                }
                            }}
                        />
                    </div>
                </CardHeader>
                {autoSettings.enabled && (
                    <CardContent className="pt-0 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Время публикации</Label>
                                <Input
                                    type="time"
                                    value={autoSettings.publishTime}
                                    onChange={(e) => setAutoSettings(prev => ({
                                        ...prev,
                                        publishTime: e.target.value
                                    }))}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Публикаций в день</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={autoSettings.dailyLimit}
                                    onChange={(e) => setAutoSettings(prev => ({
                                        ...prev,
                                        dailyLimit: parseInt(e.target.value) || 10
                                    }))}
                                    className="h-9"
                                />
                            </div>
                            <div className="flex items-end gap-2 pb-1">
                                <Switch
                                    id="auto-delete"
                                    checked={autoSettings.autoDeleteSold}
                                    onCheckedChange={(checked) => setAutoSettings(prev => ({ ...prev, autoDeleteSold: checked }))}
                                />
                                <Label htmlFor="auto-delete" className="text-sm">Удалять проданные</Label>
                            </div>
                        </div>

                        <Button onClick={saveSettings} disabled={savingSettings} size="sm" variant="outline" className="w-full">
                            {savingSettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Сохранить настройки
                        </Button>
                    </CardContent>
                )}
            </Card>

            {/* Statistics */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-5 w-5" />
                            Статистика публикаций VK
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetPublishedCount}
                            disabled={resetting}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            <span className="ml-1 text-xs">Сбросить</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                            <div className="text-3xl font-bold">{stats?.total || 0}</div>
                            <div className="text-sm text-muted-foreground">Всего в базе</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                            <div className="text-3xl font-bold text-green-600">{stats?.published || 0}</div>
                            <div className="text-sm text-muted-foreground">Опубликовано</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                            <div className="text-3xl font-bold text-orange-600">{stats?.unpublished || 0}</div>
                            <div className="text-sm text-muted-foreground">Не опубликовано</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                            <div className="text-3xl font-bold text-red-600">{stats?.errors || 0}</div>
                            <div className="text-sm text-muted-foreground">Ошибки</div>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-950 rounded-lg">
                            <div className="text-3xl font-bold text-slate-600">{stats?.deleted || 0}</div>
                            <div className="text-sm text-muted-foreground">Удалено</div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span>Прогресс</span>
                            <span>{vkProgress}%</span>
                        </div>
                        <Progress value={vkProgress} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            {/* Manual Publishing */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Ручная публикация
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Label>Кол-во участков:</Label>
                        <Input
                            type="number"
                            min={1}
                            max={100}
                            className="w-24"
                            value={publishCount}
                            onChange={(e) => setPublishCount(parseInt(e.target.value) || 10)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button onClick={() => startBulkPublish(false)} disabled={publishing} className="h-auto py-4 flex-col">
                            {publishing ? <Loader2 className="h-5 w-5 animate-spin mb-1" /> : <Send className="h-5 w-5 mb-1" />}
                            <span>Опубликовать {publishCount} шт</span>
                        </Button>
                        <Button variant="secondary" onClick={() => startBulkPublish(true)} disabled={publishing} className="h-auto py-4 flex-col">
                            <Send className="h-5 w-5 mb-1" />
                            <span>Опубликовать ВСЕ</span>
                        </Button>
                        <Button variant="outline" onClick={runSync} disabled={syncing} className="h-auto py-4 flex-col">
                            {syncing ? <Loader2 className="h-5 w-5 animate-spin mb-1" /> : <Trash2 className="h-5 w-5 mb-1" />}
                            <span>Удалить проданные</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ScrollText className="h-5 w-5" />
                        Последние действия
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">Нет записей</p>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {logs.map(log => (
                                <div key={log.id} className="flex items-start gap-3 text-sm p-2 rounded hover:bg-muted">
                                    {log.action === 'publish' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                                    {log.action === 'delete' && <Trash2 className="h-4 w-4 text-red-500 mt-0.5" />}
                                    {log.action === 'error' && <XCircle className="h-4 w-4 text-orange-500 mt-0.5" />}
                                    {log.action === 'sync' && <RefreshCw className="h-4 w-4 text-blue-500 mt-0.5" />}
                                    {log.action === 'settings' && <Settings2 className="h-4 w-4 text-purple-500 mt-0.5" />}
                                    {log.action === 'reset' && <RotateCcw className="h-4 w-4 text-gray-500 mt-0.5" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate">{log.message}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('ru-RU')}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">{log.action}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
