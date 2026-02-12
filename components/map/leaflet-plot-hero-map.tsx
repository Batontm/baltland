"use client"

import { useEffect, useState, useMemo } from "react"
import { MapContainer, TileLayer, Polygon, Marker, useMap } from "react-leaflet"
import L from "leaflet"
import { MapPin, Phone, MessageCircle, ChevronUp, ChevronDown, Maximize2, Minimize2, Minus, Plus, Mountain, Map as MapIcon, Ruler } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { LandPlot } from "@/lib/types"

import "leaflet/dist/leaflet.css"

// Smooth transitions CSS (250-300ms as per best practices)
const smoothCSS = `
/* Zoom animation on tiles */
.leaflet-tile-container {
  transition: opacity 0.25s ease-in-out;
}
.leaflet-zoom-anim .leaflet-zoom-animated {
  transition: transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
}
/* Polygon transitions */
.leaflet-overlay-pane svg path {
  transition: stroke-width 0.25s ease, fill-opacity 0.25s ease;
}
/* Marker transitions */
.leaflet-marker-pane .leaflet-marker-icon {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
`

// Fix for default marker icons
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

// Tile layers
const TILE_LAYERS = {
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Tiles &copy; Esri",
    },
    scheme: {
        url: "/api/map-tiles/{z}/{x}/{y}",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
}

interface PlotHeroMapProps {
    plot: LandPlot
    bundlePlots?: LandPlot[]
    totalArea: number
    price: number
    phone?: string | null
    onViewingRequest?: () => void
    onCallRequest?: () => void
}

// Convert coordinates
function convertCoords(coords: any): [number, number] {
    if (!coords || !Array.isArray(coords)) return [0, 0]

    const x = coords[0]
    const y = coords[1]

    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
        return [0, 0]
    }

    if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
        return [y, x]
    }

    if (Math.abs(x) <= 90 && Math.abs(y) <= 180) {
        return [x, y]
    }

    const lon = (x * 180) / 20037508.34
    let lat = (y * 180) / 20037508.34
    lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2)

    if (Number.isNaN(lat) || Number.isNaN(lon)) return [0, 0]
    return [lat, lon]
}

function convertCoordsArray(coords: any): any {
    if (!coords || !Array.isArray(coords)) return []
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
        return coords.map(convertCoordsArray)
    }
    if (Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
        return coords.map(convertCoords)
    }
    return convertCoords(coords)
}

// Smooth wheel zoom implementation
function SmoothWheelZoom() {
    const map = useMap()

    useEffect(() => {
        if (!map) return

        // Disable default wheel zoom
        map.scrollWheelZoom.disable()

        let targetZoom = map.getZoom()
        let currentZoom = targetZoom
        let animationId: number | null = null

        const smoothZoom = () => {
            const diff = targetZoom - currentZoom
            if (Math.abs(diff) < 0.005) {
                currentZoom = targetZoom
                animationId = null
                return
            }

            // Easing: move 10% of the remaining distance each frame (smoother)
            currentZoom += diff * 0.1
            map.setZoom(currentZoom, { animate: false })

            animationId = requestAnimationFrame(smoothZoom)
        }

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            e.stopPropagation()

            // Calculate zoom change based on wheel delta
            // Larger divisor = slower/smoother zoom
            const zoomDelta = -e.deltaY / 500

            // Clamp target zoom to map bounds
            const minZoom = map.getMinZoom()
            const maxZoom = map.getMaxZoom()
            targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom + zoomDelta))

            // Start animation if not already running
            if (!animationId) {
                animationId = requestAnimationFrame(smoothZoom)
            }
        }

        const container = map.getContainer()
        container.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            container.removeEventListener('wheel', handleWheel)
            if (animationId) cancelAnimationFrame(animationId)
            map.scrollWheelZoom.enable()
        }
    }, [map])

    return null
}

// Map controls component
function MapControls({ mapType, onToggleType, isFullscreen, onToggleFullscreen }: { mapType: "satellite" | "scheme"; onToggleType: () => void; isFullscreen: boolean; onToggleFullscreen: () => void }) {
    const map = useMap()

    useEffect(() => {
        // Invalidate map size after fullscreen toggle so tiles render correctly
        setTimeout(() => map.invalidateSize(), 50)
    }, [isFullscreen, map])

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
            <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
                onClick={onToggleFullscreen}
                aria-label={isFullscreen ? "Свернуть карту" : "Раскрыть карту"}
            >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
                onClick={() => map.zoomIn()}
            >
                <Plus className="h-4 w-4" />
            </Button>

            <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
                onClick={() => map.zoomOut()}
            >
                <Minus className="h-4 w-4" />
            </Button>

            <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
                onClick={onToggleType}
                title={mapType === "satellite" ? "Показать схему" : "Показать спутник"}
            >
                {mapType === "satellite" ? <MapIcon className="h-4 w-4" /> : <Mountain className="h-4 w-4" />}
            </Button>
        </div>
    )
}

// Fit bounds to polygon
function FitBounds({ polygons }: { polygons: Array<[number, number][]> }) {
    const map = useMap()

    useEffect(() => {
        const allPoints: [number, number][] = polygons.flat().filter(p => p[0] !== 0 && p[1] !== 0)
        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints)
            map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17 })
        }
    }, [map, polygons])

    return null
}

export function PlotHeroMap({ plot, bundlePlots, totalArea, price, phone, onViewingRequest, onCallRequest }: PlotHeroMapProps) {
    const [cardExpanded, setCardExpanded] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [mapType, setMapType] = useState<"satellite" | "scheme">("scheme")
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => { document.body.style.overflow = "" }
    }, [isFullscreen])

    const toggleMapType = () => {
        setMapType(prev => prev === "satellite" ? "scheme" : "satellite")
    }

    const formatPrice = (p: number) => new Intl.NumberFormat("ru-RU").format(p) + " ₽"
    const locationText = plot.location || plot.district || "Калининградская область"

    // Parse polygon coordinates for a single plot
    const parsePolygons = (p: LandPlot): Array<[number, number][]> => {
        if (!p.coordinates_json) return []

        try {
            let geom = typeof p.coordinates_json === "string"
                ? JSON.parse(p.coordinates_json)
                : p.coordinates_json

            const result: Array<[number, number][]> = []

            if (geom?.type === "Polygon" && geom?.coordinates) {
                const ring = convertCoordsArray(geom.coordinates[0]) as [number, number][]
                if (ring.length > 0) result.push(ring)
            } else if (geom?.type === "MultiPolygon" && geom?.coordinates) {
                for (const poly of geom.coordinates) {
                    const ring = convertCoordsArray(poly[0]) as [number, number][]
                    if (ring.length > 0) result.push(ring)
                }
            } else if (geom?.coordinates && Array.isArray(geom.coordinates[0])) {
                const ring = convertCoordsArray(geom.coordinates[0]) as [number, number][]
                if (ring.length > 0) result.push(ring)
            }

            return result
        } catch (e) {
            return []
        }
    }

    // Parse polygons for all bundle plots or just the main plot
    const allBundlePlotsData = useMemo(() => {
        const plotsToRender = bundlePlots && bundlePlots.length > 0 ? bundlePlots : [plot]
        return plotsToRender.map(p => {
            const polygons = parsePolygons(p)
            const isLease = String(p.ownership_type || "").toLowerCase().includes("lease") ||
                String(p.ownership_type || "").toLowerCase().includes("аренд") ||
                String(p.title || "").toLowerCase().includes("аренда")
            return {
                plot: p,
                polygons,
                color: isLease ? "#3b82f6" : "#22c55e" // blue for lease, green for ownership
            }
        })
    }, [bundlePlots, plot])

    // Collect all polygons for FitBounds
    const allPolygons = useMemo(() => {
        return allBundlePlotsData.flatMap(data => data.polygons)
    }, [allBundlePlotsData])

    const hasCoordinates = plot.center_lat && plot.center_lon
    const center: [number, number] = hasCoordinates
        ? [plot.center_lat!, plot.center_lon!]
        : allPolygons.length > 0 && allPolygons[0].length > 0
            ? [
                allPolygons[0].reduce((sum, p) => sum + p[0], 0) / allPolygons[0].length,
                allPolygons[0].reduce((sum, p) => sum + p[1], 0) / allPolygons[0].length
            ]
            : [54.7104, 20.5101]

    const canShowMap = mounted && (hasCoordinates || allPolygons.length > 0)

    // Show image fallback if no coordinates
    if (!canShowMap) {
        return (
            <div className="relative w-full h-[50vh] md:h-[55vh] overflow-hidden rounded-2xl">
                {plot.image_url ? (
                    <>
                        <Image src={plot.image_url} alt={plot.title} fill className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                            <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg">
                                <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                                <p className="text-sm font-medium text-muted-foreground">Карта скоро появится</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100">
                        <div className="text-center p-8">
                            <MapPin className="h-16 w-16 mx-auto mb-4 text-emerald-300" />
                            <p className="text-lg font-medium text-emerald-700">Карта готовится</p>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={isFullscreen ? "fixed inset-0 z-[9999] bg-white" : "relative w-full h-[50vh] md:h-[55vh] overflow-hidden rounded-2xl"}>
            <MapContainer
                center={center}
                zoom={16}
                className="absolute inset-0 z-0"
                zoomControl={false}
                attributionControl={false}
                wheelPxPerZoomLevel={120}
                zoomSnap={0.25}
                zoomDelta={0.25}
                fadeAnimation={true}
                zoomAnimation={true}
            >
                <style>{smoothCSS}</style>
                <TileLayer
                    key={mapType}
                    url={TILE_LAYERS[mapType].url}
                    attribution={TILE_LAYERS[mapType].attribution}
                    keepBuffer={4}
                />

                {allPolygons.length > 0 ? (
                    <>
                        {allBundlePlotsData.map((plotData, plotIdx) =>
                            plotData.polygons.map((ring: [number, number][], ringIdx: number) => (
                                <Polygon
                                    key={`${plotIdx}-${ringIdx}`}
                                    positions={ring}
                                    pathOptions={{
                                        fillColor: plotData.color,
                                        fillOpacity: 0.4,
                                        color: "#dc2626", // red border for selection
                                        weight: 3,
                                    }}
                                />
                            ))
                        )}
                        <FitBounds polygons={allPolygons} />
                    </>
                ) : (
                    <Marker position={center} />
                )}

                <SmoothWheelZoom />
                <MapControls mapType={mapType} onToggleType={toggleMapType} isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen(f => !f)} />
            </MapContainer>
        </div>
    )
}

// Floating card component
function FloatingInfoCard({
    plot, bundlePlots, totalArea, price, cardExpanded, setCardExpanded,
    formatPrice, locationText, onCallRequest, onViewingRequest,
}: {
    plot: LandPlot; bundlePlots?: LandPlot[]; totalArea: number; price: number
    cardExpanded: boolean; setCardExpanded: (v: boolean) => void
    formatPrice: (p: number) => string; locationText: string
    onCallRequest?: () => void; onViewingRequest?: () => void
}) {
    const isBundle = bundlePlots && bundlePlots.length > 1

    // Get ownership label for a plot
    const getOwnershipLabel = (p: LandPlot) => {
        const ot = String(p.ownership_type || "").toLowerCase()
        const title = String(p.title || "").toLowerCase()
        const isLease = ot.includes("lease") || ot.includes("аренд") || title.includes("аренда")
        return isLease ? "аренда" : "собственность"
    }

    // Get all cadastral entries for bundle
    const cadastralEntries = isBundle
        ? bundlePlots
            .filter(p => p.cadastral_number)
            .sort((a, b) => String(a.cadastral_number).localeCompare(String(b.cadastral_number)))
            .map(p => ({
                cadastral: p.cadastral_number!,
                label: getOwnershipLabel(p),
                isLease: getOwnershipLabel(p) === "аренда"
            }))
        : null

    // Build title
    const displayTitle = `Участок ${totalArea} сот., ${locationText}`

    return (
        <div className="absolute left-0 right-0 bottom-0 z-[1001]">
            {/* Gradient overlay that fades into content */}
            <div className="h-16 bg-gradient-to-b from-transparent to-white/80" />

            {/* Main card content */}
            <div className="bg-white px-6 pb-6 pt-4">
                {/* Title */}
                <h1 className="text-2xl md:text-3xl font-semibold mb-2">{displayTitle}</h1>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{locationText}</span>
                </div>

                {/* Bundle badge */}
                {isBundle && (
                    <div className="mb-4">
                        <span className="inline-block bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full">
                            🔗 Продаются вместе ({bundlePlots.length} участков)
                        </span>
                    </div>
                )}

                {/* Cadastral numbers with ownership (for bundles) */}
                {cadastralEntries && (
                    <div className="mb-4 space-y-1.5">
                        {cadastralEntries.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="font-mono text-slate-600">{entry.cadastral}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${entry.isLease ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                    {entry.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                        {formatPrice(price)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm">
                        <Ruler className="h-4 w-4" />
                        {totalArea} соток
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm">
                        {plot.land_status || "ИЖС"}
                    </span>
                </div>

                {/* Utilities */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {plot.has_gas && <Badge variant="secondary" className="px-2 py-1 text-xs rounded-full">🔥 Газ</Badge>}
                    {plot.has_electricity && <Badge variant="secondary" className="px-2 py-1 text-xs rounded-full">⚡ Свет</Badge>}
                    {plot.has_water && <Badge variant="secondary" className="px-2 py-1 text-xs rounded-full">💧 Вода</Badge>}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <Button className="rounded-full h-11 px-6 bg-[#2dac6e] hover:bg-[#28a062]" onClick={onCallRequest}>
                        <Phone className="h-4 w-4 mr-2" />
                        Позвонить
                    </Button>
                    <Button variant="outline" className="rounded-full h-11 px-6" onClick={onViewingRequest}>
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Заказать звонок
                    </Button>
                </div>
            </div>
        </div>
    )
}
