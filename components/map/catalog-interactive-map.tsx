"use client"

import { useState, useMemo, useEffect } from "react"
import dynamic from "next/dynamic"
import { type LandPlot, type MapSettings } from "@/lib/types"

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

interface CatalogInteractiveMapProps {
    plots: LandPlot[]
    mapSettings?: MapSettings | null
}

export function CatalogInteractiveMap({ plots, mapSettings }: CatalogInteractiveMapProps) {
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null)

    // Ensure we only show plots with coordinates
    const plotsWithCoords = useMemo(() =>
        plots.filter(p =>
            p.coordinates_json ||
            p.has_coordinates ||
            (typeof p.center_lat === "number" && typeof p.center_lon === "number")),
        [plots])

    return (
        <div className="h-[600px] border border-border/50 rounded-3xl overflow-hidden bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-full h-full relative bg-muted/5">
                <LeafletCatalogMap
                    plots={plotsWithCoords}
                    selectedPlotId={selectedPlotId}
                    onSelectPlot={setSelectedPlotId}
                />
            </div>
        </div>
    )
}
