"use client"

import dynamic from "next/dynamic"
import type { LandPlot } from "@/lib/types"

// Dynamically import Leaflet component to avoid SSR issues
const PlotHeroMap = dynamic(
    () => import("@/components/map/leaflet-plot-hero-map").then(mod => ({ default: mod.PlotHeroMap })),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[50vh] md:h-[55vh] bg-slate-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Загрузка карты...</p>
                </div>
            </div>
        )
    }
)

interface PlotHeroMapWrapperProps {
    plot: LandPlot
    bundlePlots?: LandPlot[]
    totalArea: number
    price: number
    phone?: string | null
}

export function PlotHeroMapWrapper({ plot, bundlePlots, totalArea, price, phone }: PlotHeroMapWrapperProps) {
    const handleCallRequest = () => {
        if (phone) {
            window.location.href = `tel:${phone.replace(/\s/g, "")}`
        }
    }

    const handleViewingRequest = () => {
        window.dispatchEvent(new CustomEvent("rkkland:viewing", { detail: { plotId: plot.id } }))
    }

    return (
        <PlotHeroMap
            plot={plot}
            bundlePlots={bundlePlots}
            totalArea={totalArea}
            price={price}
            phone={phone}
            onCallRequest={handleCallRequest}
            onViewingRequest={handleViewingRequest}
        />
    )
}
