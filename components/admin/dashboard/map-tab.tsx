"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Maximize2, ExternalLink, Map as MapIcon } from "lucide-react"
import { type LandPlot, type MapSettings } from "@/lib/types"
import type { OrganizationSettings } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

// Dynamic import for Leaflet (SSR fix)
const LeafletCatalogMap = dynamic(
    () => import("@/components/map/leaflet-catalog-map").then(mod => ({ default: mod.LeafletCatalogMap })),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Загрузка карты...</p>
                </div>
            </div>
        )
    }
)

interface MapTabProps {
    plots: LandPlot[]
    mapSettings?: MapSettings | null
    orgSettings?: OrganizationSettings | null
    loadingSettings?: boolean
    onChangeSettings?: (patch: Partial<OrganizationSettings>) => void
    onSaveSettings?: (data: Partial<OrganizationSettings>) => void
}

export function MapTab({
    plots,
    mapSettings,
    orgSettings,
    loadingSettings,
    onChangeSettings,
    onSaveSettings,
}: MapTabProps) {
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null)
    const [syncingGeometry, setSyncingGeometry] = useState(false)
    const { toast } = useToast()

    const handleSelectPlot = (id: string | null) => {
        setSelectedPlotId(id)
    }

    const selectedPlot = plots.find(p => p.id === selectedPlotId)

    const handleBatchSyncGeometry = async () => {
        setSyncingGeometry(true)
        try {
            const res = await fetch("/api/admin/batch-sync-coordinates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ limit: 50 }),
            })

            const json = await res.json().catch(() => null)
            if (!res.ok || !json?.success) {
                throw new Error(json?.error || `HTTP ${res.status}`)
            }

            toast({
                title: "Синхронизация геометрии завершена",
                description: `Найдено: ${json.found}, обработано: ${json.processed}. Обнови страницу, чтобы увидеть полигоны на карте.`,
            })
        } catch (e) {
            toast({
                title: "Ошибка синхронизации геометрии",
                description: String((e as any)?.message || e),
                variant: "destructive",
            })
        } finally {
            setSyncingGeometry(false)
        }
    }

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)] gap-4 pb-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <MapIcon className="h-6 w-6 text-emerald-600" />
                        Интерактивная карта
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Leaflet с Esri спутником и OSM схемой
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={selectedPlot?.cadastral_number ? `https://nspd.gov.ru/map?query=${selectedPlot.cadastral_number}` : "https://nspd.gov.ru/map"}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Открыть в НСПД
                        </a>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchSyncGeometry}
                        disabled={syncingGeometry}
                    >
                        {syncingGeometry ? "Синхронизация..." : "Синхронизировать полигоны"}
                    </Button>
                </div>
            </div>

            {/* Map Area */}
            <div className="bg-slate-100 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative group h-[70vh] min-h-[520px]">
                <LeafletCatalogMap
                    plots={plots}
                    selectedPlotId={selectedPlotId}
                    onSelectPlot={handleSelectPlot}
                />

                {/* Legend/Hint Overlay */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-lg z-[1000]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                            <Maximize2 className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-900">Легенда</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#10b981" }} />
                            <span className="text-[11px] text-slate-700">Собственность</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#f97316" }} />
                            <span className="text-[11px] text-slate-700">Аренда (с правом выкупа)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#64748b" }} />
                            <span className="text-[11px] text-slate-700">Забронировано</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#3b82f6" }} />
                            <span className="text-[11px] text-slate-700">Комплексный лот</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Removed Yandex settings card - no longer needed */}
        </div>
    )
}
