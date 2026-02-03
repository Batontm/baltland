import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { AddressCombobox } from "@/components/ui/address-combobox"
import { Archive, Bookmark, Edit, Image as ImageIcon, Plus, Search, TreePine, Trash2, X, MapPin, RefreshCw, Star, Upload, Merge } from "lucide-react"
import { cn } from "@/lib/utils"
import { LAND_STATUS_OPTIONS } from "@/lib/types"
import type { LandPlot, District, Settlement, LandPlotImage } from "@/lib/types"
import { batchSyncCoordinates, syncSinglePlot, getLandPlotById, updatePlot, mergePlots } from "@/app/actions"
import { toast } from "sonner"
import { useState, useEffect, useMemo } from "react"
import { VKPublishButton } from "@/components/admin/vk-publish-button"

export type PlotStatusFilter = "all" | "active" | "archived" | "reserved"

interface PlotsTabProps {
  plots: LandPlot[]
  filteredPlots: LandPlot[]
  plotFormData: Partial<LandPlot>
  isBundleMode: boolean
  onIsBundleModeChange: (value: boolean) => void
  bundleRows: Array<{ cadastral_number: string; area_sotok: string; ownership_type: string }>
  onBundleRowsChange: (rows: Array<{ cadastral_number: string; area_sotok: string; ownership_type: string }>) => void
  isCreatingPlot: boolean
  editingPlot: LandPlot | null
  loading: boolean
  plotSearch: string
  plotStatusFilter: PlotStatusFilter
  plotDistrictFilter: string
  plotSettlementFilter: string
  plotNoGeoFilter: boolean
  districts: District[]
  settlements: Settlement[]
  loadingAddresses: boolean
  onCreate: () => void
  onCancel: () => void
  onSave: () => void
  onEdit: (plot: LandPlot) => void
  onDelete: (id: string) => void
  onRefresh: () => void
  onChangeForm: (patch: Partial<LandPlot>) => void
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: PlotStatusFilter) => void
  onDistrictFilterChange: (value: string) => void
  onSettlementFilterChange: (value: string) => void
  onNoGeoFilterChange: (value: boolean) => void
  onDistrictChange: (districtName: string) => void
}

function BundleCadastralEditor({
  bundleId,
  plots,
  saving,
  onSave,
  onDeleteRow,
}: {
  bundleId: string | number
  plots: LandPlot[]
  saving: boolean
  onSave: (rows: Array<{ id: string; cadastral_number: string; area_sotok: string }>) => Promise<void>
  onDeleteRow: (plotId: string) => Promise<void>
}) {
  const bundleKey = String(bundleId)
  const initialRows = plots
    .filter((p) => String(p.bundle_id) === bundleKey)
    .slice()
    .sort((a, b) => {
      const aCn = String(a.cadastral_number || "")
      const bCn = String(b.cadastral_number || "")
      return aCn.localeCompare(bCn)
    })
    .map((p) => ({
      id: p.id,
      cadastral_number: String(p.cadastral_number || ""),
      area_sotok: String(p.area_sotok ?? ""),
      ownership_type: String(p.ownership_type || "ownership")
    }))

  const [rows, setRows] = useState<Array<{ id: string; cadastral_number: string; area_sotok: string; ownership_type: string }>>(initialRows)

  useEffect(() => {
    setRows(initialRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleId])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_40px] gap-3">
        <div className="text-xs text-muted-foreground">Кадастровый номер</div>
        <div className="text-xs text-muted-foreground">Площадь (сот.)</div>
        <div className="text-xs text-muted-foreground">Право</div>
        <div />
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_40px] gap-3 items-center">
            <Input
              value={row.cadastral_number}
              onChange={(e) => {
                const next = rows.slice()
                next[idx] = { ...next[idx], cadastral_number: e.target.value }
                setRows(next)
              }}
              placeholder="39:01:000000:0000"
              className="rounded-xl"
              disabled={saving}
            />
            <Input
              value={row.area_sotok}
              onChange={(e) => {
                const next = rows.slice()
                next[idx] = { ...next[idx], area_sotok: e.target.value }
                setRows(next)
              }}
              placeholder="6"
              className="rounded-xl"
              disabled={saving}
            />
            <Select
              value={row.ownership_type || "ownership"}
              onValueChange={(v) => {
                const next = rows.slice()
                next[idx] = { ...next[idx], ownership_type: v }
                setRows(next)
              }}
              disabled={saving}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ownership">Собственность</SelectItem>
                <SelectItem value="lease">Аренда</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={saving || rows.length <= 1}
              title={rows.length <= 1 ? "Нельзя удалить последний кадастровый номер" : "Удалить кадастровый номер"}
              onClick={async () => {
                if (rows.length <= 1) return
                if (!confirm("Удалить этот кадастровый номер из лота?")) return
                await onDeleteRow(row.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={async () => await onSave(rows)}
          disabled={saving}
        >
          {saving ? "Сохранение..." : "Сохранить кадастровые номера"}
        </Button>
      </div>
    </div>
  )
}

const formatPrice = (price: number) => new Intl.NumberFormat("ru-RU").format(price) + " ₽"

export function PlotsTab({
  plots,
  filteredPlots,
  plotFormData,
  isBundleMode,
  onIsBundleModeChange,
  bundleRows,
  onBundleRowsChange,
  isCreatingPlot,
  editingPlot,
  loading,
  plotSearch,
  plotStatusFilter,
  plotDistrictFilter,
  plotSettlementFilter,
  plotNoGeoFilter,
  districts,
  settlements,
  loadingAddresses,
  onCreate,
  onCancel,
  onSave,
  onEdit,
  onDelete,
  onRefresh,
  onChangeForm,
  onSearchChange,
  onStatusFilterChange,
  onDistrictFilterChange,
  onSettlementFilterChange,
  onNoGeoFilterChange,
  onDistrictChange,
}: PlotsTabProps) {

  const [quickActionLoadingPlotId, setQuickActionLoadingPlotId] = useState<string | null>(null)
  const [coordsSyncLoadingPlotId, setCoordsSyncLoadingPlotId] = useState<string | null>(null)
  const [batchCoordsSyncLoading, setBatchCoordsSyncLoading] = useState(false)

  const handleSaveBundleRows = async (
    bundleId: string,
    rows: Array<{ id: string; cadastral_number: string; area_sotok: string; ownership_type?: string }>
  ) => {
    setQuickActionLoadingPlotId(bundleId)
    try {
      let updated = 0
      let errors = 0

      for (const row of rows) {
        try {
          const areaRaw = String(row.area_sotok ?? "").trim()
          const areaNum = areaRaw === "" ? 0 : Number(areaRaw)
          await updatePlot(row.id, {
            cadastral_number: row.cadastral_number,
            area_sotok: Number.isFinite(areaNum) ? areaNum : 0,
            ownership_type: row.ownership_type,
          })
          updated++
        } catch {
          errors++
        }
      }

      if (updated > 0) {
        toast.success(`Сохранено: ${updated}${errors ? `, ошибок: ${errors}` : ""}`)
        onRefresh()
      } else {
        toast.error("Не удалось сохранить изменения")
      }
    } finally {
      setQuickActionLoadingPlotId(null)
    }
  }

  const handleDeleteBundleRow = async (bundleId: string | number, plotId: string) => {
    const bundleKey = String(bundleId)
    const bundlePlots = plots.filter((p) => String(p.bundle_id) === bundleKey)
    if (bundlePlots.length <= 1) {
      toast.error("Нельзя удалить последний кадастровый номер")
      return
    }

    const deleting = bundlePlots.find((p) => p.id === plotId) || null
    const wasPrimary = !!deleting?.is_bundle_primary

    try {
      await Promise.resolve(onDelete(plotId))

      // If we removed the primary plot, choose another plot in the bundle as primary
      if (wasPrimary) {
        const fallback = bundlePlots.find((p) => p.id !== plotId) || null
        if (fallback) {
          try {
            await updatePlot(fallback.id, { is_bundle_primary: true })
          } catch {
            // ignore, refresh will show if it failed
          }
        }
      }

      toast.success("Кадастровый номер удалён")
      onRefresh()
    } catch (e: any) {
      toast.error(e?.message || "Не удалось удалить")
    }
  }

  const bundleMetaById = useMemo(() => {
    const map = new Map<
      string,
      {
        plots: LandPlot[]
        totalArea: number
        totalPrice: number
        cadastralEntries: Array<{ cadastral: string; area: number; ownership: string }>
      }
    >()

    plots.forEach((p) => {
      const b = p.bundle_id
      if (!b) return
      const existing = map.get(b)
      if (existing) {
        existing.plots.push(p)
      } else {
        map.set(b, { plots: [p], totalArea: 0, totalPrice: 0, cadastralEntries: [] })
      }
    })

    for (const [, meta] of map.entries()) {
      meta.totalArea = meta.plots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
      meta.totalPrice = meta.plots.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
      meta.cadastralEntries = meta.plots
        .slice()
        .sort((a, b) => String(a.cadastral_number || "").localeCompare(String(b.cadastral_number || "")))
        .map((p) => ({
          cadastral: String(p.cadastral_number || "").trim(),
          area: Number(p.area_sotok) || 0,
          ownership: String(p.ownership_type || "ownership")
        }))
        .filter((v) => !!v.cadastral)
    }

    return map
  }, [plots])

  const visiblePlots = useMemo(() => {
    const bundleIdsMatching = new Set<string>()
    filteredPlots.forEach(p => {
      if (p.bundle_id) bundleIdsMatching.add(p.bundle_id)
    })

    const bundlesShown = new Set<string>()
    const result: LandPlot[] = []

    // Use filteredPlots to decide which cards to show
    // For bundled plots, show the primary (representative) card if any bundle member is in filteredPlots
    // For unbundled plots, show if they are in filteredPlots
    filteredPlots.forEach(p => {
      if (!p.bundle_id) {
        result.push(p)
      } else if (!bundlesShown.has(p.bundle_id)) {
        // Find is_bundle_primary in the FULL plots list
        const primary = plots.find(plot => plot.bundle_id === p.bundle_id && plot.is_bundle_primary)
          || plots.find(plot => plot.bundle_id === p.bundle_id)
        if (primary && !result.some(r => r.id === primary.id)) {
          result.push(primary)
          bundlesShown.add(p.bundle_id)
        }
      }
    })

    return result
  }, [filteredPlots, plots])

  const handleSyncSingleCoordinates = async (plotId: string) => {
    setCoordsSyncLoadingPlotId(plotId)
    try {
      const res = await syncSinglePlot(plotId)
      const fresh = await getLandPlotById(plotId)
      if (fresh) onChangeForm(fresh)

      if (res.success) {
        toast.success("Координаты обновлены")
        onRefresh()
        return
      }

      const syncError = fresh?.sync_error
      toast.error(syncError || res.error || "Ошибка синхронизации")
    } catch (e: any) {
      toast.error(e?.message || "Ошибка синхронизации")
    } finally {
      setCoordsSyncLoadingPlotId(null)
    }
  }

  const handleSyncBundleCoordinates = async (plot: LandPlot) => {
    // If this is a bundle, sync all plots in the bundle
    if (plot.bundle_id) {
      const bundleKey = String(plot.bundle_id)
      const bundlePlots = plots.filter((p) => String(p.bundle_id) === bundleKey)
      setCoordsSyncLoadingPlotId(plot.id)

      try {
        let successCount = 0
        let errorCount = 0

        for (const bundlePlot of bundlePlots) {
          try {
            const res = await syncSinglePlot(bundlePlot.id)
            if (res.success) {
              successCount++
            } else {
              errorCount++
            }
          } catch (e) {
            errorCount++
          }
        }

        if (successCount > 0) {
          toast.success(`Координаты обновлены для ${successCount} участков${errorCount > 0 ? `, ${errorCount} с ошибками` : ''}`)
          onRefresh()
        } else {
          toast.error("Не удалось обновить координаты ни для одного участка")
        }
      } catch (e: any) {
        toast.error(e?.message || "Ошибка синхронизации")
      } finally {
        setCoordsSyncLoadingPlotId(null)
      }
    } else {
      // If not a bundle, sync single plot
      await handleSyncSingleCoordinates(plot.id)
    }
  }

  const handleBatchSyncMissingCoordinates = async (limit = 20) => {
    setBatchCoordsSyncLoading(true)
    try {
      const res = await fetch("/api/admin/batch-sync-coordinates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        toast.error(json?.error || "Ошибка синхронизации")
        return
      }

      toast.success(`Синхронизация завершена: найдено ${json.found} из ${json.processed} участков`)
      onRefresh()
    } catch (e: any) {
      toast.error(e?.message || "Ошибка синхронизации")
    } finally {
      setBatchCoordsSyncLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">Управление участками</h2>
          <div className="flex gap-2">
            <Button
              variant={plotStatusFilter === "archived" || plotStatusFilter === "reserved" ? "outline" : "default"}
              size="sm"
              onClick={() => onStatusFilterChange("active")}
              className="rounded-xl"
            >
              Активные
            </Button>
            <Button
              variant={plotStatusFilter === "reserved" ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange("reserved")}
              className="rounded-xl"
            >
              Забронированные
            </Button>
            <Button
              variant={plotStatusFilter === "archived" ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusFilterChange("archived")}
              className="rounded-xl"
            >
              Архив участков
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={plotNoGeoFilter ? "default" : "outline"}
            size="sm"
            onClick={() => onNoGeoFilterChange(!plotNoGeoFilter)}
            className={cn(
              "rounded-xl",
              plotNoGeoFilter ? "bg-slate-700 hover:bg-slate-800 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
            disabled={loading || plots.length === 0}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Без геометки
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await handleBatchSyncMissingCoordinates(20)
            }}
            className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            disabled={batchCoordsSyncLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", batchCoordsSyncLoading && "animate-spin")} />
            Обновить отсутствующие координаты
          </Button>
          <Button onClick={onCreate} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Добавить участок
          </Button>
        </div>
      </div>

      {/* Search and filters section */}
      <Card className="rounded-2xl">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={plotSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Название, адрес, кадастр..."
                  className="rounded-xl pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={plotStatusFilter} onValueChange={(v: any) => onStatusFilterChange(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все участки</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="reserved">Забронированные</SelectItem>
                  <SelectItem value="archived">Архивные</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* District Filter */}
            <div className="space-y-2">
              <Label>Район</Label>
              <AddressCombobox
                value={plotDistrictFilter === "all" ? "" : plotDistrictFilter}
                onValueChange={(value) => onDistrictFilterChange(value || "all")}
                options={districts.map(d => ({ id: d.id, name: d.name }))}
                placeholder="Все районы"
                searchPlaceholder="Поиск района..."
                emptyText="Район не найден"
                loading={loadingAddresses}
                className="rounded-xl"
              />
            </div>

            {/* Settlement Filter */}
            <div className="space-y-2">
              <Label>Населенный пункт</Label>
              <AddressCombobox
                value={plotSettlementFilter === "all" ? "" : plotSettlementFilter}
                onValueChange={(value) => onSettlementFilterChange(value || "all")}
                options={settlements.map(s => ({ id: s.id, name: s.name }))}
                placeholder="Все поселки"
                searchPlaceholder="Поиск населенного пункта..."
                emptyText="Населенный пункт не найден"
                loading={loadingAddresses}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                onSearchChange("")
                onStatusFilterChange("all")
                onDistrictFilterChange("all")
                onSettlementFilterChange("all")
                onNoGeoFilterChange(false)
                onDistrictChange("")
              }}
            >
              Сброс всех фильтров
            </Button>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Найдено: {filteredPlots.length} из {plots.length} участков
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">

        <div className="space-y-4">
          {isCreatingPlot && (
            <Card className="rounded-2xl overflow-hidden border-primary/20 shadow-lg border-2">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Новый участок</h3>
                  <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <PlotFullEditor
                  plotFormData={plotFormData}
                  onChangeForm={onChangeForm}
                  isBundleMode={isBundleMode}
                  onIsBundleModeChange={onIsBundleModeChange}
                  bundleRows={bundleRows}
                  onBundleRowsChange={onBundleRowsChange}
                  isCreatingPlot={isCreatingPlot}
                  districts={districts}
                  settlements={settlements}
                  loadingAddresses={loadingAddresses}
                  onDistrictChange={onDistrictChange}
                  onSave={onSave}
                  onCancel={onCancel}
                  loading={loading}
                />
              </div>
            </Card>
          )}

          {visiblePlots.map((plot) => {
            const isEditingThis = editingPlot?.id === plot.id;
            const bundleMeta = plot.bundle_id ? bundleMetaById.get(plot.bundle_id) ?? null : null
            const totalArea = bundleMeta ? bundleMeta.totalArea : (Number(plot.area_sotok) || 0)
            const totalPrice = bundleMeta ? bundleMeta.totalPrice : (Number(plot.price) || 0)
            return (
              <div key={plot.id} className="space-y-2">
                <Card
                  className={cn(
                    "rounded-2xl overflow-hidden transition-all duration-300",
                    isEditingThis ? "ring-2 ring-primary border-primary/30 shadow-md" : "hover:shadow-md"
                  )}
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-48 h-32 bg-secondary flex-shrink-0">
                      {plot.image_url ? (
                        <img
                          src={plot.image_url}
                          alt={plot.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TreePine className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="flex-1 p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{[plot.district, plot.location].filter(Boolean).join(", ") || "—"}</h3>
                            {plot.is_featured && <Badge className="bg-amber-500">Избранный</Badge>}
                            {!plot.is_active && <Badge variant="secondary">Скрыт</Badge>}
                            {plot.status === "archived" && <Badge variant="outline">Архив</Badge>}
                            {plot.has_coordinates ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 cursor-help">
                                    <MapPin className="h-3 w-3" />
                                    Геометка OK
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <p className="font-semibold">Координаты участка:</p>
                                    <p>Широта: {plot.center_lat?.toFixed(6)}</p>
                                    <p>Долгота: {plot.center_lon?.toFixed(6)}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-slate-400 border-slate-200 flex items-center gap-1 cursor-help">
                                    <MapPin className="h-3 w-3" />
                                    Нет геометрии
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1 max-w-[200px]">
                                    <p className="font-semibold text-slate-900">Геометрия не загружена</p>
                                    {plot.sync_error ? (
                                      <p className="text-red-500">Причина: {plot.sync_error}</p>
                                    ) : (
                                      <p>Нажмите на иконку синхронизации справа для получения данных из НСПД.</p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {plot.title || "Без названия"}
                          </p>
                          {plot.cadastral_number && (
                            <div className="space-y-1">
                              {bundleMeta ? (
                                bundleMeta.cadastralEntries.map((entry, eidx) => (
                                  <div key={eidx} className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground font-mono">{entry.cadastral}</span>
                                    <Badge variant="outline" className={cn(
                                      "text-[10px] px-1 py-0 h-4",
                                      entry.ownership === 'lease' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    )}>
                                      {entry.ownership === 'lease' ? 'аренда' : 'собственность'}
                                    </Badge>
                                    <span className="text-muted-foreground">({entry.area} сот.)</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground font-mono">
                                  КН: {plot.cadastral_number}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-primary">{formatPrice(totalPrice)}</span>
                            <span>{totalArea} сот.</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            title={plot.bundle_id ? "Синхронизировать координаты всех участков в пакете" : "Синхронизировать координаты"}
                            onClick={async () => await handleSyncBundleCoordinates(plot)}
                            className="rounded-lg border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                            disabled={loading || coordsSyncLoadingPlotId === plot.id}
                          >
                            <RefreshCw className={cn("h-4 w-4", coordsSyncLoadingPlotId === plot.id && "animate-spin")} />
                          </Button>

                          <VKPublishButton plotId={plot.id} compact initialPost={plot.vk_post} />

                          <Button
                            variant={plot.is_reserved ? "default" : "outline"}
                            size="sm"
                            title={plot.is_reserved ? "Снять бронь" : "Забронировать"}
                            disabled={loading || quickActionLoadingPlotId === plot.id}
                            onClick={async () => {
                              setQuickActionLoadingPlotId(plot.id)
                              try {
                                await updatePlot(plot.id, { is_reserved: !plot.is_reserved })
                                toast.success(plot.is_reserved ? "Бронь снята" : "Участок забронирован")
                                onRefresh()
                              } catch (e: any) {
                                toast.error(e?.message || "Ошибка")
                              } finally {
                                setQuickActionLoadingPlotId(null)
                              }
                            }}
                            className={cn(
                              "rounded-lg",
                              plot.is_reserved
                                ? "bg-slate-700 hover:bg-slate-800 text-white"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            title="Продан (в архив)"
                            disabled={loading || quickActionLoadingPlotId === plot.id || !plot.is_active}
                            onClick={async () => {
                              if (!confirm("Пометить участок как проданный и отправить в архив?")) return
                              setQuickActionLoadingPlotId(plot.id)
                              try {
                                await updatePlot(plot.id, { is_active: false })
                                toast.success("Участок отправлен в архив")
                                onRefresh()
                              } catch (e: any) {
                                toast.error(e?.message || "Ошибка")
                              } finally {
                                setQuickActionLoadingPlotId(null)
                              }
                            }}
                            className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            title="Вернуть из архива"
                            disabled={loading || quickActionLoadingPlotId === plot.id || plot.is_active}
                            onClick={async () => {
                              setQuickActionLoadingPlotId(plot.id)
                              try {
                                await updatePlot(plot.id, { is_active: true })
                                toast.success("Участок восстановлен")
                                onRefresh()
                              } catch (e: any) {
                                toast.error(e?.message || "Ошибка")
                              } finally {
                                setQuickActionLoadingPlotId(null)
                              }
                            }}
                            className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <Archive className="h-4 w-4 rotate-180" />
                          </Button>

                          <Button
                            variant={isEditingThis ? "default" : "outline"}
                            size="sm"
                            onClick={() => isEditingThis ? onCancel() : onEdit(plot)}
                            className="rounded-lg"
                          >
                            {isEditingThis ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                          </Button>

                          {/* Merge button - only for zero-price plots */}
                          {plot.price <= 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              title="Объединить с другим участком"
                              disabled={loading || quickActionLoadingPlotId === plot.id}
                              onClick={async () => {
                                // Find plots in same location with price > 0
                                const targetPlots = plots.filter(p =>
                                  p.id !== plot.id &&
                                  p.is_active &&
                                  p.price > 0 &&
                                  (p.location === plot.location || p.district === plot.district)
                                ).slice(0, 20)

                                if (targetPlots.length === 0) {
                                  toast.error("Нет подходящих участков для объединения в этом районе")
                                  return
                                }

                                // Create simple selection prompt
                                const options = targetPlots.map(p =>
                                  `${p.cadastral_number || 'Без КН'} — ${(p.price / 1000000).toFixed(1)}М₽ — ${p.location || p.district}`
                                )
                                const selected = prompt(
                                  `Выберите номер участка для объединения (1-${targetPlots.length}):\n\n` +
                                  options.map((o, i) => `${i + 1}. ${o}`).join('\n')
                                )

                                if (!selected) return
                                const idx = parseInt(selected, 10) - 1
                                if (isNaN(idx) || idx < 0 || idx >= targetPlots.length) {
                                  toast.error("Неверный выбор")
                                  return
                                }

                                const targetPlot = targetPlots[idx]
                                if (!confirm(`Объединить участок ${plot.cadastral_number} с ${targetPlot.cadastral_number}?\n\nКН и координаты будут перенесены, участок-источник будет деактивирован.`)) {
                                  return
                                }

                                setQuickActionLoadingPlotId(plot.id)
                                try {
                                  const result = await mergePlots(plot.id, targetPlot.id)
                                  if (result.success) {
                                    toast.success(`Участок объединён с ${targetPlot.cadastral_number}`)
                                    onRefresh()
                                  } else {
                                    toast.error(result.error || "Ошибка объединения")
                                  }
                                } catch (e: any) {
                                  toast.error(e?.message || "Ошибка")
                                } finally {
                                  setQuickActionLoadingPlotId(null)
                                }
                              }}
                              className="rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Merge className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(plot.id)}
                            className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  {isEditingThis && (
                    <div className="bg-slate-50 border-t p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="font-semibold text-lg">Редактирование участка</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          title={plot.bundle_id ? "Синхронизировать координаты всех участков в пакете" : "Синхронизировать координаты"}
                          onClick={async () => await handleSyncBundleCoordinates(plot)}
                          className="rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                          disabled={loading || coordsSyncLoadingPlotId === plot.id}
                        >
                          <RefreshCw className={cn("h-4 w-4 mr-2", coordsSyncLoadingPlotId === plot.id && "animate-spin")} />
                          Обновить по КН
                        </Button>
                      </div>

                      <div className="space-y-8">
                        <div>
                          <h5 className="font-medium mb-3 text-slate-500 uppercase tracking-wider text-[10px]">Фотографии участка</h5>
                          <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <PlotPhotosManager
                              plotId={plot.id}
                              plotTitle={plot.title || ""}
                              onChanged={onRefresh}
                            />
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium mb-3 text-slate-500 uppercase tracking-wider text-[10px]">Видео</h5>
                          <div className="bg-white rounded-2xl border p-4 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label>YouTube (ссылка на видео)</Label>
                                <Input
                                  value={(plotFormData.youtube_video_url as any) || ""}
                                  onChange={(e) => onChangeForm({ youtube_video_url: e.target.value } as any)}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="rounded-xl"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>RuTube (ссылка на видео)</Label>
                                <Input
                                  value={(plotFormData.rutube_video_url as any) || ""}
                                  onChange={(e) => onChangeForm({ rutube_video_url: e.target.value } as any)}
                                  placeholder="https://rutube.ru/video/..."
                                  className="rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {plot.bundle_id && (
                          <div>
                            <h5 className="font-medium mb-3 text-slate-500 uppercase tracking-wider text-[10px]">Кадастровые номера (лот продаётся вместе)</h5>
                            <div className="bg-white rounded-2xl border p-4 shadow-sm">
                              <BundleCadastralEditor
                                bundleId={plot.bundle_id}
                                plots={plots}
                                saving={quickActionLoadingPlotId === String(plot.bundle_id)}
                                onSave={async (rows) => await handleSaveBundleRows(String(plot.bundle_id), rows)}
                                onDeleteRow={async (plotId) => await handleDeleteBundleRow(plot.bundle_id as any, plotId)}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <PlotFullEditor
                            plotFormData={plotFormData}
                            onChangeForm={onChangeForm}
                            bundleRows={bundleRows}
                            onBundleRowsChange={onBundleRowsChange}
                            hideCadastralInput={!!plot.bundle_id}
                            districts={districts}
                            settlements={settlements}
                            loadingAddresses={loadingAddresses}
                            onDistrictChange={onDistrictChange}
                            onSave={onSave}
                            onCancel={onCancel}
                            loading={loading}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}

          {filteredPlots.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Участки не найдены</p>
              <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper Components for the new inline UI
function PlotFullEditor({
  plotFormData,
  onChangeForm,
  isBundleMode,
  onIsBundleModeChange,
  bundleRows,
  onBundleRowsChange,
  isCreatingPlot,
  hideCadastralInput,
  districts,
  settlements,
  loadingAddresses,
  onDistrictChange,
  onSave,
  onCancel,
  loading
}: {
  plotFormData: Partial<LandPlot>
  onChangeForm: (patch: Partial<LandPlot>) => void
  isBundleMode?: boolean
  onIsBundleModeChange?: (v: boolean) => void
  bundleRows?: Array<{ cadastral_number: string; area_sotok: string; ownership_type: string }>
  onBundleRowsChange?: (rows: Array<{ cadastral_number: string; area_sotok: string; ownership_type: string }>) => void
  isCreatingPlot?: boolean
  hideCadastralInput?: boolean
  districts: District[]
  settlements: Settlement[]
  loadingAddresses: boolean
  onDistrictChange: (d: string) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
}) {
  const ensureAtLeastOneRow = () => {
    if (!onBundleRowsChange) return
    if (Array.isArray(bundleRows) && bundleRows.length > 0) return
    onBundleRowsChange([{ cadastral_number: "", area_sotok: "", ownership_type: "ownership" }])
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Название</Label>
          <Input
            value={plotFormData.title || ""}
            onChange={(e) => onChangeForm({ title: e.target.value })}
            placeholder="Участок у леса"
            className="rounded-xl"
          />
        </div>
        {!isCreatingPlot || !isBundleMode ? (
          <div className="space-y-2">
            <Label>Кадастровый номер</Label>
            {hideCadastralInput ? (
              <div className="h-10 rounded-xl border bg-slate-50 flex items-center px-3 text-sm text-muted-foreground">
                Кадастровые номера редактируются выше (в списке лота)
              </div>
            ) : (
              <Input
                value={plotFormData.cadastral_number || ""}
                onChange={(e) => onChangeForm({ cadastral_number: e.target.value })}
                placeholder="39:01:000000:0000"
                className="rounded-xl"
              />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="opacity-0">Кадастровый номер</Label>
            <div className="h-10" />
          </div>
        )}
      </div>

      {/* Additional Cadastral Numbers - separate input fields */}
      {!hideCadastralInput && !isBundleMode && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Дополнительные кадастровые номера (лот)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                const current = plotFormData.additional_cadastral_numbers || []
                onChangeForm({ additional_cadastral_numbers: [...current, ""] })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить КН
            </Button>
          </div>

          {(plotFormData.additional_cadastral_numbers || []).length > 0 && (
            <div className="space-y-2 border rounded-xl p-4 bg-slate-50">
              {(plotFormData.additional_cadastral_numbers || []).map((cn: string, idx: number) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground w-6">{idx + 2}.</span>
                  <Input
                    value={cn || ""}
                    onChange={(e) => {
                      const next = [...(plotFormData.additional_cadastral_numbers || [])]
                      next[idx] = e.target.value
                      onChangeForm({ additional_cadastral_numbers: next })
                    }}
                    placeholder="39:01:000000:0000"
                    className="rounded-xl flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full shrink-0"
                    onClick={() => {
                      const next = [...(plotFormData.additional_cadastral_numbers || [])]
                      next.splice(idx, 1)
                      onChangeForm({ additional_cadastral_numbers: next })
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                Все участки будут отображаться на карте отдельно, но в каталоге — как один лот
              </p>
            </div>
          )}
        </div>
      )}

      {isCreatingPlot && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label>Кадастровые номера продаются вместе</Label>
            <Switch
              checked={!!isBundleMode}
              onCheckedChange={(v) => {
                onIsBundleModeChange?.(!!v)
                if (v) ensureAtLeastOneRow()
              }}
            />
          </div>

          {isBundleMode && (
            <div className="space-y-2 border rounded-xl p-4 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_40px] gap-3">
                <div className="text-xs text-muted-foreground">Кадастровый номер</div>
                <div className="text-xs text-muted-foreground">Площадь (сот.)</div>
                <div />
              </div>

              <div className="space-y-3">
                {(bundleRows || []).map((row: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_160px_40px] gap-3">
                    <Input
                      value={row?.cadastral_number || ""}
                      onChange={(e) => {
                        const next = [...(bundleRows || [])]
                        next[idx] = { ...next[idx], cadastral_number: e.target.value }
                        onBundleRowsChange?.(next as any)
                      }}
                      placeholder="39:01:000000:0000"
                      className="rounded-xl"
                    />
                    <Input
                      value={row?.area_sotok || ""}
                      onChange={(e) => {
                        const next = [...(bundleRows || [])]
                        next[idx] = { ...next[idx], area_sotok: e.target.value }
                        onBundleRowsChange?.(next as any)
                      }}
                      placeholder="необязательно"
                      className="rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => {
                        const next = [...(bundleRows || [])]
                        next.splice(idx, 1)
                        onBundleRowsChange?.(next.length ? (next as any) : [{ cadastral_number: "", area_sotok: "", ownership_type: "ownership" }])
                      }}
                      disabled={(bundleRows || []).length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-muted-foreground">
                  Площадь необязательна (можно оставить пустой)
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => onBundleRowsChange?.([...(bundleRows || []), { cadastral_number: "", area_sotok: "", ownership_type: "ownership" }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Цена (₽)</Label>
          <Input
            type="number"
            value={plotFormData.price || ""}
            onChange={(e) => onChangeForm({ price: Number(e.target.value) })}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>Площадь (сот.)</Label>
          {hideCadastralInput || isBundleMode ? (
            <div className="h-10 rounded-xl border bg-slate-50 flex items-center px-3 text-sm font-medium">
              {(() => {
                const total = (bundleRows || []).reduce((sum, r) => sum + (Number(r.area_sotok) || 0), 0)
                return total > 0 ? total : (plotFormData.area_sotok || 0)
              })()}
            </div>
          ) : (
            <Input
              type="number"
              value={plotFormData.area_sotok || ""}
              onChange={(e) => onChangeForm({ area_sotok: Number(e.target.value) })}
              className="rounded-xl"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Район</Label>
          <AddressCombobox
            value={plotFormData.district || ""}
            onValueChange={(value) => {
              onChangeForm({ district: value, location: "" })
              onDistrictChange(value)
            }}
            options={districts.map((d: any) => ({ id: d.id, name: d.name }))}
            placeholder="Выберите район"
            searchPlaceholder="Поиск района..."
            emptyText="Район не найден"
            loading={loadingAddresses}
          />
        </div>
        <div className="space-y-2">
          <Label>Населенный пункт</Label>
          <AddressCombobox
            value={plotFormData.location || ""}
            onValueChange={(value) => onChangeForm({ location: value })}
            options={settlements.map((s: any) => ({ id: s.id, name: s.name }))}
            placeholder={
              !plotFormData.district
                ? "Сначала выберите район"
                : "Выберите населенный пункт"
            }
            searchPlaceholder="Поиск населенного пункта..."
            emptyText="Населенный пункт не найден"
            disabled={!plotFormData.district}
            loading={loadingAddresses}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Статус земли</Label>
          <Select
            value={plotFormData.land_status || "ИЖС"}
            onValueChange={(value) => onChangeForm({ land_status: value })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAND_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          {/* Cadastral number on same line as status for better grid utilization */}
          <Label>Кадастровый номер (для справки)</Label>
          <Input
            value={plotFormData.cadastral_number || ""}
            disabled
            className="rounded-xl bg-slate-50 text-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Право</Label>
          <Select
            value={plotFormData.ownership_type || "ownership"}
            onValueChange={(value) => onChangeForm({ ownership_type: value })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ownership">Собственность</SelectItem>
              <SelectItem value="lease">Аренда</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ВРИ (id)</Label>
          <Input
            value={plotFormData.vri_id || ""}
            onChange={(e) => onChangeForm({ vri_id: e.target.value })}
            placeholder="utilization_id из НСПД"
            className="rounded-xl"
          />
        </div>
      </div>

      {String(plotFormData.ownership_type || "ownership") === "lease" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Аренда с</Label>
            <Input
              type="date"
              value={plotFormData.lease_from || ""}
              onChange={(e) => onChangeForm({ lease_from: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Аренда до (необязательно)</Label>
            <Input
              type="date"
              value={plotFormData.lease_to || ""}
              onChange={(e) => onChangeForm({ lease_to: e.target.value })}
              className="rounded-xl"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Описание</Label>
        <Textarea
          value={plotFormData.description || ""}
          onChange={(e) => onChangeForm({ description: e.target.value })}
          placeholder="Описание участка..."
          className="rounded-xl min-h-[120px]"
        />
      </div>

      <div className="space-y-4">
        <Label className="text-base font-semibold">Настройки и Коммуникации</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <CommunicationSwitch
            label="Газ"
            checked={plotFormData.has_gas}
            onCheckedChange={(v: boolean) => onChangeForm({ has_gas: v })}
          />
          <CommunicationSwitch
            label="Электр."
            checked={plotFormData.has_electricity}
            onCheckedChange={(v: boolean) => onChangeForm({ has_electricity: v })}
          />
          <CommunicationSwitch
            label="Вода"
            checked={plotFormData.has_water}
            onCheckedChange={(v: boolean) => onChangeForm({ has_water: v })}
          />
          <CommunicationSwitch
            label="Рассрочка"
            checked={plotFormData.has_installment}
            onCheckedChange={(v: boolean) => onChangeForm({ has_installment: v })}
          />
          <CommunicationSwitch
            label="Забронирован"
            checked={!!plotFormData.is_reserved}
            onCheckedChange={(v: boolean) => onChangeForm({ is_reserved: v })}
            className="bg-slate-50 border-slate-200"
          />
          <CommunicationSwitch
            label="Избранный"
            checked={plotFormData.is_featured}
            onCheckedChange={(v: boolean) => onChangeForm({ is_featured: v })}
            className="bg-amber-50 border-amber-100"
          />
          <CommunicationSwitch
            label="Активный"
            checked={plotFormData.is_active !== false}
            onCheckedChange={(v: boolean) => onChangeForm({ is_active: v })}
            className="bg-emerald-50 border-emerald-100"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button onClick={onSave} disabled={loading} className="flex-1 rounded-xl py-6 text-lg">
          {loading ? "Сохранение..." : "Сохранить изменения"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl px-8 py-6 text-lg bg-transparent border-slate-200">
          Отмена
        </Button>
      </div>
    </div>
  );
}

function CommunicationSwitch({ label, checked, onCheckedChange, className }: any) {
  return (
    <div className={cn("flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-transparent", className)}>
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked || false} onCheckedChange={onCheckedChange} />
    </div>
  );
}


function PlotPhotosManager({ plotId, plotTitle, onChanged }: { plotId: string, plotTitle: string, onChanged: () => void }) {
  const [images, setImages] = useState<LandPlotImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  const loadImages = async () => {
    if (!plotId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/plots/${plotId}/images`, { cache: "no-store" })
      const json = await res.json()
      if (json?.success) setImages(json.images || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
  }, [plotId])

  const handleUpload = async (file: File, makeCover: boolean) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("makeCover", makeCover ? "true" : "false")

      const res = await fetch(`/api/admin/plots/${plotId}/images`, {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.error || "Ошибка загрузки")
        return
      }
      await loadImages()
      onChanged?.()
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!confirm("Удалить изображение?")) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/plots/${plotId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error(json?.error || "Ошибка удаления")
        return
      }
      await loadImages()
      onChanged?.()
    } finally {
      setLoading(false)
    }
  }

  const handleSetCover = async (imageId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/plots/${plotId}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })
      const json = await res.json()
      if (!json?.success) {
        toast.error("Ошибка при установке обложки")
        return
      }
      await loadImages()
      onChanged?.()
    } finally {
      setLoading(false)
    }
  }

  const persistOrder = async (next: LandPlotImage[]) => {
    setSavingOrder(true)
    try {
      const orderedIds = next.map((i: LandPlotImage) => i.id)
      const res = await fetch(`/api/admin/plots/${plotId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      })
      const json = await res.json().catch(() => null)
      if (!json?.success) {
        toast.error(json?.error || "Ошибка сохранения порядка")
        return
      }
      await loadImages()
      onChanged?.()
    } finally {
      setSavingOrder(false)
    }
  }

  const reorder = (activeId: string, overId: string) => {
    if (savingOrder) return
    if (activeId === overId) return

    const fromIndex = images.findIndex((i: LandPlotImage) => i.id === activeId)
    const toIndex = images.findIndex((i: LandPlotImage) => i.id === overId)
    if (fromIndex < 0 || toIndex < 0) return

    const next = [...images]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setImages(next)
    void persistOrder(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById(`upload-${plotId}`)?.click()}
          className="rounded-lg"
        >
          <Upload className="h-4 w-4 mr-2" />
          Добавить фото
        </Button>
        <input
          id={`upload-${plotId}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f, false)
            e.target.value = ""
          }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {images.map((img) => (
          <div
            key={img.id}
            className={cn(
              "relative group rounded-lg overflow-hidden border",
              savingOrder && "opacity-60",
              draggingId === img.id && "ring-2 ring-primary",
            )}
            draggable
            onDragStart={(e) => {
              setDraggingId(img.id)
              e.dataTransfer.effectAllowed = "move"
              e.dataTransfer.setData("text/plain", img.id)
            }}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = "move"
            }}
            onDrop={(e) => {
              e.preventDefault()
              const activeId = e.dataTransfer.getData("text/plain")
              setDraggingId(null)
              if (!activeId) return
              reorder(activeId, img.id)
            }}
            title="Перетащите, чтобы изменить порядок"
          >
            <img src={img.public_url} alt="" className="w-full h-24 object-cover" />
            {img.is_cover && (
              <div className="absolute top-1 left-1 bg-amber-500 text-white p-1 rounded-full">
                <Star className="h-3 w-3 fill-current" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => handleSetCover(img.id)}
                title="Сделать обложкой"
              >
                <Star className={cn("h-4 w-4", img.is_cover && "fill-current")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                onClick={() => handleDelete(img.id)}
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {images.length === 0 && !loading && (
          <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed rounded-lg">
            Нет дополнительных фотографий
          </div>
        )}
      </div>
    </div>
  )
}

