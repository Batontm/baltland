'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RefreshCw, Send, Trash2, AlertCircle, CheckCircle2, Clock, Settings, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

interface OKSettings {
    enabled: boolean
    daily_limit: number
    auto_delete_sold: boolean
    publish_time: string
}

interface OKStats {
    published: number
    errors: number
    deleted: number
    unpublished: number
}

interface SocialLog {
    id: string
    platform: string
    action: string
    message: string
    created_at: string
}

export function OdnoklassnikiTab() {
    const [settings, setSettings] = useState<OKSettings>({
        enabled: false,
        daily_limit: 10,
        auto_delete_sold: true,
        publish_time: '12:00'
    })
    const [stats, setStats] = useState<OKStats>({
        published: 0,
        errors: 0,
        deleted: 0,
        unpublished: 0
    })
    const [totalPlots, setTotalPlots] = useState(0)
    const [logs, setLogs] = useState<SocialLog[]>([])
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [resetting, setResetting] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [settingsRes, statsRes, logsRes] = await Promise.all([
                fetch('/api/admin/social/ok/settings'),
                fetch('/api/admin/social/stats'),
                fetch('/api/admin/social/logs?platform=ok&limit=20')
            ])

            if (settingsRes.ok) {
                const data = await settingsRes.json()
                setSettings({
                    enabled: data.enabled ?? false,
                    daily_limit: data.daily_limit ?? 10,
                    auto_delete_sold: data.auto_delete_sold ?? true,
                    publish_time: data.publish_time ?? '12:00'
                })
            }

            if (statsRes.ok) {
                const data = await statsRes.json()
                setTotalPlots(data.plots?.total || 0)
                if (data.plots?.ok) {
                    setStats(data.plots.ok)
                }
            }

            if (logsRes.ok) {
                const data = await logsRes.json()
                setLogs(data.logs || [])
            }
        } catch (error) {
            console.error('Failed to load OK data:', error)
            toast.error('Ошибка загрузки данных')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const saveSettings = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/social/ok/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                toast.success('Настройки сохранены')
                loadData()
            } else {
                toast.error('Ошибка сохранения')
            }
        } catch (error) {
            toast.error('Ошибка сохранения настроек')
        } finally {
            setSaving(false)
        }
    }

    const handlePublish = async (limit: number = 1) => {
        setPublishing(true)
        try {
            const res = await fetch('/api/admin/social/ok/bulk-publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(`Опубликовано: ${data.published}, Ошибок: ${data.errors}`)
                loadData()
            } else {
                toast.error(data.error || 'Ошибка публикации')
            }
        } catch (error) {
            toast.error('Ошибка публикации')
        } finally {
            setPublishing(false)
        }
    }

    const handleSync = async () => {
        setSyncing(true)
        try {
            const res = await fetch('/api/admin/social/ok/sync', { method: 'POST' })
            const data = await res.json()

            if (res.ok) {
                toast.success(`Синхронизация: удалено ${data.deleted} постов`)
                loadData()
            } else {
                toast.error('Ошибка синхронизации')
            }
        } catch (error) {
            toast.error('Ошибка синхронизации')
        } finally {
            setSyncing(false)
        }
    }

    const handleReset = async () => {
        if (!confirm('Вы уверены? Это удалит все записи о публикациях OK из базы данных.')) {
            return
        }

        setResetting(true)
        try {
            const res = await fetch('/api/admin/social/ok/reset', { method: 'POST' })
            const data = await res.json()

            if (res.ok) {
                toast.success(`Сброс: удалено ${data.deleted} записей`)
                loadData()
            } else {
                toast.error('Ошибка сброса')
            }
        } catch (error) {
            toast.error('Ошибка сброса')
        } finally {
            setResetting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Статистика */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего участков</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPlots}</div>
                        <p className="text-xs text-muted-foreground">активных в базе</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Опубликовано</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.published}</div>
                        <p className="text-xs text-muted-foreground">в Одноклассниках</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Не опубликовано</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.unpublished}</div>
                        <p className="text-xs text-muted-foreground">ожидают публикации</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ошибки</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                        <p className="text-xs text-muted-foreground">при публикации</p>
                    </CardContent>
                </Card>
            </div>

            {/* Настройки и Действия */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Настройки автопубликации */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Настройки автопубликации
                        </CardTitle>
                        <CardDescription>
                            Настройте автоматическую публикацию в Одноклассники
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="ok-enabled">Автопубликация включена</Label>
                            <Switch
                                id="ok-enabled"
                                checked={settings.enabled}
                                onCheckedChange={(checked) => setSettings(s => ({ ...s, enabled: checked }))}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="ok-auto-delete">Удалять проданные</Label>
                            <Switch
                                id="ok-auto-delete"
                                checked={settings.auto_delete_sold}
                                onCheckedChange={(checked) => setSettings(s => ({ ...s, auto_delete_sold: checked }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ok-limit">Лимит публикаций в день</Label>
                            <Input
                                id="ok-limit"
                                type="number"
                                min={1}
                                max={50}
                                value={settings.daily_limit}
                                onChange={(e) => setSettings(s => ({ ...s, daily_limit: parseInt(e.target.value) || 10 }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ok-time">Время публикации</Label>
                            <Input
                                id="ok-time"
                                type="time"
                                value={settings.publish_time}
                                onChange={(e) => setSettings(s => ({ ...s, publish_time: e.target.value }))}
                            />
                        </div>

                        <Button onClick={saveSettings} disabled={saving} className="w-full">
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Сохранить настройки
                        </Button>
                    </CardContent>
                </Card>

                {/* Ручная публикация */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5" />
                            Ручная публикация
                        </CardTitle>
                        <CardDescription>
                            Опубликуйте участки в Одноклассники вручную
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handlePublish(1)}
                                disabled={publishing}
                            >
                                {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                1 участок
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handlePublish(5)}
                                disabled={publishing}
                            >
                                {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                5 участков
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handlePublish(10)}
                                disabled={publishing}
                            >
                                {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                10 участков
                            </Button>
                            <Button
                                onClick={() => handlePublish(settings.daily_limit)}
                                disabled={publishing}
                            >
                                {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                Лимит ({settings.daily_limit})
                            </Button>
                        </div>

                        <div className="pt-4 border-t space-y-2">
                            <Button
                                variant="outline"
                                onClick={handleSync}
                                disabled={syncing}
                                className="w-full"
                            >
                                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                Синхронизировать (удалить проданные)
                            </Button>

                            <Button
                                variant="destructive"
                                onClick={handleReset}
                                disabled={resetting}
                                className="w-full"
                            >
                                {resetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                                Сбросить счётчик
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Лог действий */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Лог действий</span>
                        <Button variant="ghost" size="sm" onClick={loadData}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Нет записей</p>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                                    <Badge variant={
                                        log.action === 'publish' ? 'default' :
                                            log.action === 'sync' ? 'secondary' :
                                                log.action === 'error' ? 'destructive' : 'outline'
                                    }>
                                        {log.action}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm">{log.message}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(log.created_at).toLocaleString('ru-RU')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
