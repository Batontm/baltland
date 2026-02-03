"use client"

import { useMemo, useState } from "react"
import type { OrganizationSettings, NspdSettings } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { testNspdConnection, syncLocalCoordinatesFileFromDb, syncPlotByCadastralNumber } from "@/app/actions"
import { testProxyConnection } from "@/app/actions/test-proxy"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface NspdTabProps {
  orgSettings: OrganizationSettings | null
  loadingSettings: boolean
  onChangeSettings: (patch: Partial<OrganizationSettings>) => void
  onSaveSettings: (data: Partial<OrganizationSettings>) => void
}

function withDefaults(value: NspdSettings | null | undefined): Required<NspdSettings> {
  const v = value ?? {}
  return {
    proxy: v.proxy ?? null,
    proxy_auth: v.proxy_auth ?? null,
    proxy_simple: v.proxy_simple ?? null,
    timeout_ms: typeof v.timeout_ms === "number" ? v.timeout_ms : 15000,
    coords_order: v.coords_order ?? "lat,lon",
  }
}

function numOr(value: string, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeCoordsOrder(value: string): "lat,lon" | "lon,lat" {
  const v = String(value || "").trim().toLowerCase()
  return v === "lon,lat" ? "lon,lat" : "lat,lon"
}

export function NspdTab({ orgSettings, loadingSettings, onChangeSettings, onSaveSettings }: NspdTabProps) {
  const current = useMemo(() => withDefaults(orgSettings?.nspd_settings ?? null), [orgSettings?.nspd_settings])

  const patch = (p: Partial<NspdSettings>) => {
    onChangeSettings({ nspd_settings: { ...current, ...p } })
  }

  const [testCad, setTestCad] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; added: number; total: number } | null>(null)

  // Manual sync by cadastral number
  const [manualCad, setManualCad] = useState("")
  const [manualSyncing, setManualSyncing] = useState(false)
  const [manualSyncResult, setManualSyncResult] = useState<{
    success: boolean
    message: string
    details?: { geometry_type?: string; centroid?: [number, number] | null; hasContour?: boolean }
  } | null>(null)

  // Proxy status states
  const [proxyAuthStatus, setProxyAuthStatus] = useState<"idle" | "checking" | "success" | "error">("idle")
  const [proxyAuthMessage, setProxyAuthMessage] = useState("")
  const [proxySimpleStatus, setProxySimpleStatus] = useState<"idle" | "checking" | "success" | "error">("idle")
  const [proxySimpleMessage, setProxySimpleMessage] = useState("")

  const checkProxyAuth = async () => {
    if (!current.proxy_auth?.trim()) return
    setProxyAuthStatus("checking")
    setProxyAuthMessage("")
    try {
      const res = await testProxyConnection(current.proxy_auth)
      setProxyAuthStatus(res.success ? "success" : "error")
      setProxyAuthMessage(res.message)
    } catch (e: any) {
      setProxyAuthStatus("error")
      setProxyAuthMessage(e.message || "Ошибка")
    }
  }

  const checkProxySimple = async () => {
    if (!current.proxy_simple?.trim()) return
    setProxySimpleStatus("checking")
    setProxySimpleMessage("")
    try {
      const res = await testProxyConnection(current.proxy_simple)
      setProxySimpleStatus(res.success ? "success" : "error")
      setProxySimpleMessage(res.message)
    } catch (e: any) {
      setProxySimpleStatus("error")
      setProxySimpleMessage(e.message || "Ошибка")
    }
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testNspdConnection({ cadastralNumber: testCad })
      setTestResult(res)
    } finally {
      setTesting(false)
    }
  }

  const runSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await syncLocalCoordinatesFileFromDb()
      setSyncResult(res)
    } finally {
      setSyncing(false)
    }
  }

  const runManualSync = async () => {
    if (!manualCad.trim()) return
    setManualSyncing(true)
    setManualSyncResult(null)
    try {
      const res = await syncPlotByCadastralNumber(manualCad.trim())
      setManualSyncResult(res)
    } finally {
      setManualSyncing(false)
    }
  }

  if (loadingSettings && !orgSettings) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center text-muted-foreground">Загрузка настроек...</CardContent>
      </Card>
    )
  }

  if (!orgSettings) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-8 text-center text-muted-foreground">Не удалось загрузить настройки</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Недвижимость — НСПД</h2>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-xl">Настройки НСПД</CardTitle>
          <CardDescription>Параметры подключения и обработки координат</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Proxy with auth */}
          <div className="space-y-2">
            <Label>Прокси с авторизацией (login:password@host:port)</Label>
            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {proxyAuthStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                {proxyAuthStatus === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {proxyAuthStatus === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                {proxyAuthStatus === "idle" && <div className="w-3 h-3 rounded-full bg-slate-200" />}
              </div>
              <Input
                className="flex-1"
                value={current.proxy_auth ?? ""}
                onChange={(e) => patch({ proxy_auth: e.target.value.trim() ? e.target.value.trim() : null })}
                placeholder="user:pass@proxy.example.com:8080"
              />
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={!current.proxy_auth?.trim() || proxyAuthStatus === "checking"}
                onClick={checkProxyAuth}
              >
                Проверить
              </Button>
            </div>
            {proxyAuthMessage && (
              <p className={`text-xs ${proxyAuthStatus === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {proxyAuthMessage}
              </p>
            )}
          </div>

          {/* Simple proxy */}
          <div className="space-y-2">
            <Label>Простой прокси (host:port)</Label>
            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {proxySimpleStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                {proxySimpleStatus === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {proxySimpleStatus === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                {proxySimpleStatus === "idle" && <div className="w-3 h-3 rounded-full bg-slate-200" />}
              </div>
              <Input
                className="flex-1"
                value={current.proxy_simple ?? ""}
                onChange={(e) => patch({ proxy_simple: e.target.value.trim() ? e.target.value.trim() : null })}
                placeholder="192.168.1.1:8080"
              />
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={!current.proxy_simple?.trim() || proxySimpleStatus === "checking"}
                onClick={checkProxySimple}
              >
                Проверить
              </Button>
            </div>
            {proxySimpleMessage && (
              <p className={`text-xs ${proxySimpleStatus === "success" ? "text-emerald-600" : "text-red-600"}`}>
                {proxySimpleMessage}
              </p>
            )}
          </div>

          {/* Other settings */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Timeout (ms)</Label>
              <Input value={String(current.timeout_ms)} onChange={(e) => patch({ timeout_ms: numOr(e.target.value, 15000) })} />
            </div>
            <div className="space-y-2">
              <Label>Порядок координат</Label>
              <Input value={String(current.coords_order)} onChange={(e) => patch({ coords_order: normalizeCoordsOrder(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Допустимо: lat,lon или lon,lat</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="rounded-xl" disabled={loadingSettings} onClick={() => onSaveSettings({ nspd_settings: { ...current } })}>
              Сохранить настройки НСПД
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-xl">Тест подключения к НСПД</CardTitle>
          <CardDescription>Проверяет запрос к НСПД по кадастровому номеру и показывает причину ошибки</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
            <div className="space-y-2">
              <Label>Кадастровый номер для теста</Label>
              <Input value={testCad} onChange={(e) => setTestCad(e.target.value)} placeholder="39:03:..." />
            </div>
            <Button className="rounded-xl" disabled={testing} onClick={runTest}>
              {testing ? "Проверка..." : "Тест подключения"}
            </Button>
          </div>

          {testResult && (
            <div className={testResult.success ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
              <div className="font-semibold">{testResult.message}</div>
              {testResult.details && (
                <pre className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-auto">
                  {JSON.stringify(testResult.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-xl">Синхронизация координат участка</CardTitle>
          <CardDescription>
            Запрашивает координаты и полигон из НСПД и сохраняет в базу данных для указанного участка
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
            <div className="space-y-2">
              <Label>Кадастровый номер участка</Label>
              <Input
                value={manualCad}
                onChange={(e) => setManualCad(e.target.value)}
                placeholder="39:03:040036:328"
                onKeyDown={(e) => e.key === "Enter" && !manualSyncing && runManualSync()}
              />
            </div>
            <Button
              className="rounded-xl"
              disabled={manualSyncing || !manualCad.trim()}
              onClick={runManualSync}
            >
              {manualSyncing ? "Загрузка..." : "Запросить НСПД"}
            </Button>
          </div>

          {manualSyncResult && (
            <div className={`p-4 rounded-xl ${manualSyncResult.success ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
              <div className={`font-semibold flex items-center gap-2 ${manualSyncResult.success ? "text-emerald-700" : "text-red-700"}`}>
                {manualSyncResult.success ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                {manualSyncResult.message}
              </div>
              {manualSyncResult.success && manualSyncResult.details && (
                <div className="mt-2 text-sm text-emerald-600 space-y-1">
                  <div>Тип геометрии: <span className="font-medium">{manualSyncResult.details.geometry_type || "—"}</span></div>
                  <div>Полигон: <span className="font-medium">{manualSyncResult.details.hasContour ? "✓ Сохранён" : "—"}</span></div>
                  {manualSyncResult.details.centroid && (
                    <div>Центр: <span className="font-mono text-xs">{manualSyncResult.details.centroid[0].toFixed(6)}, {manualSyncResult.details.centroid[1].toFixed(6)}</span></div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-xl">Синхронизация land-plots-coordinates.json</CardTitle>
          <CardDescription>
            Дополняет файл координатами из БД: если в файле нет кадастра, но в БД есть координаты центра — запись добавится.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Button className="rounded-xl" disabled={syncing} onClick={runSync}>
            {syncing ? "Синхронизация..." : "Синхронизировать из БД"}
          </Button>

          {syncResult && (
            <div className={syncResult.success ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
              <div className="font-semibold">{syncResult.message}</div>
              <div className="text-xs mt-1">Добавлено: {syncResult.added} | Итого в файле: {syncResult.total}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
