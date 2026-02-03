"use client"

import dynamic from "next/dynamic"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { type LandPlot, type MapSettings } from "@/lib/types"
import { MapPin } from "lucide-react"

// Dynamic import for Leaflet (SSR fix)
const LeafletCatalogMap = dynamic(
    () => import("./leaflet-catalog-map").then(mod => ({ default: mod.LeafletCatalogMap })),
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

interface PlotMapDialogProps {
    plot: LandPlot | null
    allPlots: LandPlot[]
    open: boolean
    onOpenChange: (open: boolean) => void
    mapSettings?: MapSettings | null
}

export function PlotMapDialog({ plot, allPlots, open, onOpenChange, mapSettings }: PlotMapDialogProps) {
    if (!plot) return null

    const hasCoordinates = plot.coordinates_json || plot.center_lat || plot.center_lon

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl w-[98vw] h-[92vh] p-0 overflow-hidden flex flex-col gap-0 rounded-3xl border-none">
                <DialogHeader className="p-4 px-6 bg-white/80 backdrop-blur-md border-b flex-row items-center justify-between space-y-0 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-serif">
                                {plot.location || plot.district}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground font-mono">
                                КН: {[plot.cadastral_number, ...((plot as any).additional_cadastral_numbers || [])].filter(Boolean).join(', ') || '—'}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 relative">
                    {hasCoordinates ? (
                        <LeafletCatalogMap
                            plots={allPlots}
                            selectedPlotId={plot.id}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                <MapPin className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-serif font-medium mb-2 text-slate-900">Координаты не загружены</h3>
                            <p className="text-slate-500 max-w-sm">
                                Мы еще не успели привязать этот участок к карте. Для уточнения расположения обратитесь к нашему менеджеру.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
