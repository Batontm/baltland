"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { MapSettings, OrganizationSettings } from "@/lib/types"
import { Map as MapIcon, Save } from "lucide-react"

interface MapSettingsCardProps {
  orgSettings: OrganizationSettings
  loadingSettings: boolean
  onChange: (patch: Partial<OrganizationSettings>) => void
  onSave: (data: Partial<OrganizationSettings>) => void
  headerTitle?: string
  headerDescription?: string
}

const defaults: Required<MapSettings> = {
  initial_center_lat: 54.7104,
  initial_center_lon: 20.5101,
  initial_zoom: 10,
  cluster_zoom_threshold: 14,
  detail_zoom_threshold: 16,
  polygon_color: "#10b981",
  polygon_fill_color: "#10b981",
  polygon_fill_opacity: 0.25,
  polygon_weight: 1.5,
  ownership_polygon_color: "#10b981",
  lease_polygon_color: "#f97316",
  reserved_polygon_color: "#64748b",
  bundle_polygon_color: "#3b82f6",
  selected_polygon_color: "#ef4444",
  selected_polygon_fill_color: "#ef4444",
  selected_polygon_fill_opacity: 0.5,
  selected_polygon_weight: 4,
  marker_color: "#10b981",
  cluster_marker_color: "#10b981",
  show_tooltip: true,
  tooltip_show_title: true,
  tooltip_show_cadastral: true,
  tooltip_show_price: true,
  tooltip_show_area: true,
  tooltip_show_land_status: true,
  tooltip_show_location: false,
  show_marker_labels: true,

  yandex_show_type_selector: true,
  yandex_show_traffic: true,
  yandex_show_geolocation: true,
  yandex_show_zoom_control: true,
  yandex_show_fullscreen_control: true,
}

function withDefaults(value: MapSettings | null): Required<MapSettings> {
  const v = value ?? {}
  return {
    initial_center_lat: v.initial_center_lat ?? defaults.initial_center_lat,
    initial_center_lon: v.initial_center_lon ?? defaults.initial_center_lon,
    initial_zoom: v.initial_zoom ?? defaults.initial_zoom,
    cluster_zoom_threshold: v.cluster_zoom_threshold ?? defaults.cluster_zoom_threshold,
    detail_zoom_threshold: v.detail_zoom_threshold ?? defaults.detail_zoom_threshold,
    polygon_color: v.polygon_color ?? defaults.polygon_color,
    polygon_fill_color: v.polygon_fill_color ?? defaults.polygon_fill_color,
    polygon_fill_opacity: v.polygon_fill_opacity ?? defaults.polygon_fill_opacity,
    polygon_weight: v.polygon_weight ?? defaults.polygon_weight,
    ownership_polygon_color: v.ownership_polygon_color ?? defaults.ownership_polygon_color,
    lease_polygon_color: v.lease_polygon_color ?? defaults.lease_polygon_color,
    reserved_polygon_color: v.reserved_polygon_color ?? defaults.reserved_polygon_color,
    bundle_polygon_color: v.bundle_polygon_color ?? defaults.bundle_polygon_color,
    selected_polygon_color: v.selected_polygon_color ?? defaults.selected_polygon_color,
    selected_polygon_fill_color: v.selected_polygon_fill_color ?? defaults.selected_polygon_fill_color,
    selected_polygon_fill_opacity: v.selected_polygon_fill_opacity ?? defaults.selected_polygon_fill_opacity,
    selected_polygon_weight: v.selected_polygon_weight ?? defaults.selected_polygon_weight,
    marker_color: v.marker_color ?? defaults.marker_color,
    cluster_marker_color: v.cluster_marker_color ?? defaults.cluster_marker_color,
    show_tooltip: v.show_tooltip ?? defaults.show_tooltip,
    tooltip_show_title: v.tooltip_show_title ?? defaults.tooltip_show_title,
    tooltip_show_cadastral: v.tooltip_show_cadastral ?? defaults.tooltip_show_cadastral,
    tooltip_show_price: v.tooltip_show_price ?? defaults.tooltip_show_price,
    tooltip_show_area: v.tooltip_show_area ?? defaults.tooltip_show_area,
    tooltip_show_land_status: v.tooltip_show_land_status ?? defaults.tooltip_show_land_status,
    tooltip_show_location: v.tooltip_show_location ?? defaults.tooltip_show_location,
    show_marker_labels: v.show_marker_labels ?? defaults.show_marker_labels,

    yandex_show_type_selector: v.yandex_show_type_selector ?? defaults.yandex_show_type_selector,
    yandex_show_traffic: v.yandex_show_traffic ?? defaults.yandex_show_traffic,
    yandex_show_geolocation: v.yandex_show_geolocation ?? defaults.yandex_show_geolocation,
    yandex_show_zoom_control: v.yandex_show_zoom_control ?? defaults.yandex_show_zoom_control,
    yandex_show_fullscreen_control: v.yandex_show_fullscreen_control ?? defaults.yandex_show_fullscreen_control,
  }
}

function numOr(value: string, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function MapSettingsCard({
  orgSettings,
  loadingSettings,
  onChange,
  onSave,
  headerTitle,
  headerDescription,
}: MapSettingsCardProps) {
  const current = withDefaults(orgSettings.map_settings)

  const patch = (p: Partial<MapSettings>) => {
    onChange({ map_settings: { ...current, ...p } })
  }

  return (
    <Card className="rounded-2xl overflow-hidden border-emerald-100 shadow-sm">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <MapIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">{headerTitle ?? "Настройки карты"}</CardTitle>
            <CardDescription>{headerDescription ?? "Управление отображением карты в админ-панели"}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {(headerTitle ?? "").toLowerCase().includes("яндекс") && (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-900">Слои / Контролы (Яндекс)</div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <div className="font-medium">Переключатель Схема/Спутник/Гибрид</div>
                  <div className="text-xs text-muted-foreground">Контрол typeSelector</div>
                </div>
                <Switch checked={current.yandex_show_type_selector} onCheckedChange={(v) => patch({ yandex_show_type_selector: v })} />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <div className="font-medium">Пробки</div>
                  <div className="text-xs text-muted-foreground">Контрол trafficControl</div>
                </div>
                <Switch checked={current.yandex_show_traffic} onCheckedChange={(v) => patch({ yandex_show_traffic: v })} />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <div className="font-medium">Геолокация</div>
                  <div className="text-xs text-muted-foreground">Контрол geolocationControl</div>
                </div>
                <Switch checked={current.yandex_show_geolocation} onCheckedChange={(v) => patch({ yandex_show_geolocation: v })} />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <div className="font-medium">Зум</div>
                  <div className="text-xs text-muted-foreground">Контрол zoomControl</div>
                </div>
                <Switch checked={current.yandex_show_zoom_control} onCheckedChange={(v) => patch({ yandex_show_zoom_control: v })} />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <div className="font-medium">Полный экран</div>
                  <div className="text-xs text-muted-foreground">Контрол fullscreenControl</div>
                </div>
                <Switch
                  checked={current.yandex_show_fullscreen_control}
                  onCheckedChange={(v) => patch({ yandex_show_fullscreen_control: v })}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Центр (lat)</Label>
            <Input
              value={String(current.initial_center_lat)}
              onChange={(e) => patch({ initial_center_lat: numOr(e.target.value, defaults.initial_center_lat) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Центр (lon)</Label>
            <Input
              value={String(current.initial_center_lon)}
              onChange={(e) => patch({ initial_center_lon: numOr(e.target.value, defaults.initial_center_lon) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Начальный zoom</Label>
            <Input
              value={String(current.initial_zoom)}
              onChange={(e) => patch({ initial_zoom: numOr(e.target.value, defaults.initial_zoom) })}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Порог кластеров (zoom)</Label>
            <Input
              value={String(current.cluster_zoom_threshold)}
              onChange={(e) => patch({ cluster_zoom_threshold: numOr(e.target.value, defaults.cluster_zoom_threshold) })}
            />
            <p className="text-xs text-muted-foreground">До этого зума показываются кластеры по поселкам</p>
          </div>
          <div className="space-y-2">
            <Label>Порог детального вида (zoom)</Label>
            <Input
              value={String(current.detail_zoom_threshold)}
              onChange={(e) => patch({ detail_zoom_threshold: numOr(e.target.value, defaults.detail_zoom_threshold) })}
            />
            <p className="text-xs text-muted-foreground">С этого зума появляются подписи (маркер-лейблы)</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Цвет контура</Label>
                <Input value={current.polygon_color} onChange={(e) => patch({ polygon_color: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Цвет заливки</Label>
                <Input value={current.polygon_fill_color} onChange={(e) => patch({ polygon_fill_color: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Прозрачность заливки (0..1)</Label>
                <Input
                  value={String(current.polygon_fill_opacity)}
                  onChange={(e) => patch({ polygon_fill_opacity: numOr(e.target.value, defaults.polygon_fill_opacity) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Толщина контура</Label>
                <Input
                  value={String(current.polygon_weight)}
                  onChange={(e) => patch({ polygon_weight: numOr(e.target.value, defaults.polygon_weight) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Собственность: цвет</Label>
                  <Input value={current.ownership_polygon_color} onChange={(e) => patch({ ownership_polygon_color: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Аренда: цвет</Label>
                  <Input value={current.lease_polygon_color} onChange={(e) => patch({ lease_polygon_color: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Забронировано: цвет</Label>
                <Input value={current.reserved_polygon_color} onChange={(e) => patch({ reserved_polygon_color: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Комплексный лот (bundle): цвет</Label>
                <Input value={current.bundle_polygon_color} onChange={(e) => patch({ bundle_polygon_color: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Выделение: цвет контура</Label>
                <Input value={current.selected_polygon_color} onChange={(e) => patch({ selected_polygon_color: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Выделение: цвет заливки</Label>
                <Input
                  value={current.selected_polygon_fill_color}
                  onChange={(e) => patch({ selected_polygon_fill_color: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Выделение: прозрачность</Label>
                <Input
                  value={String(current.selected_polygon_fill_opacity)}
                  onChange={(e) => patch({ selected_polygon_fill_opacity: numOr(e.target.value, defaults.selected_polygon_fill_opacity) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Выделение: толщина</Label>
                <Input
                  value={String(current.selected_polygon_weight)}
                  onChange={(e) => patch({ selected_polygon_weight: numOr(e.target.value, defaults.selected_polygon_weight) })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Цвет маркера</Label>
            <Input value={current.marker_color} onChange={(e) => patch({ marker_color: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Цвет кластера</Label>
            <Input value={current.cluster_marker_color} onChange={(e) => patch({ cluster_marker_color: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-slate-900">Подсказки (tooltip)</Label>
                <p className="text-sm text-slate-500">Показывать подсказки при наведении на участок</p>
              </div>
              <Switch checked={!!current.show_tooltip} onCheckedChange={(v) => patch({ show_tooltip: v })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <Label className="text-sm">Название</Label>
                <Switch checked={!!current.tooltip_show_title} onCheckedChange={(v) => patch({ tooltip_show_title: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <Label className="text-sm">Кадастр</Label>
                <Switch checked={!!current.tooltip_show_cadastral} onCheckedChange={(v) => patch({ tooltip_show_cadastral: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <Label className="text-sm">Цена</Label>
                <Switch checked={!!current.tooltip_show_price} onCheckedChange={(v) => patch({ tooltip_show_price: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <Label className="text-sm">Площадь</Label>
                <Switch checked={!!current.tooltip_show_area} onCheckedChange={(v) => patch({ tooltip_show_area: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <Label className="text-sm">Статус</Label>
                <Switch checked={!!current.tooltip_show_land_status} onCheckedChange={(v) => patch({ tooltip_show_land_status: v })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <Label className="text-sm">Поселок</Label>
                <Switch checked={!!current.tooltip_show_location} onCheckedChange={(v) => patch({ tooltip_show_location: v })} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-slate-900">Подписи на маркерах</Label>
                <p className="text-sm text-slate-500">Показывать последние цифры кадастра (на детализации)</p>
              </div>
              <Switch checked={!!current.show_marker_labels} onCheckedChange={(v) => patch({ show_marker_labels: v })} />
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                ⚠️ Чтобы настройки работали в проде, в Supabase должна быть колонка <code>organization_settings.map_settings</code> (jsonb).
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => onSave(orgSettings)}
            disabled={loadingSettings}
            className="bg-emerald-600 hover:bg-emerald-700 h-11 px-8 rounded-xl shadow-lg shadow-emerald-200 transition-all font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            Сохранить настройки карты
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
