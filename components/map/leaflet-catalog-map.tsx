"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, useMap } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import L from "leaflet"
import { Maximize2, Mountain, Map as MapIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LandPlot } from "@/lib/types"
import { buildPlotSeoPath, buildPlotSlug } from "@/lib/utils"

import "leaflet/dist/leaflet.css"

// Smooth transitions CSS (250-300ms as per best practices)
const smoothCSS = `
/* Smooth tile fade-in */
.leaflet-tile-container {
  transition: opacity 0.4s ease-in-out;
}
.leaflet-tile {
  transition: opacity 0.4s ease-in-out;
}
/* Smooth zoom transform */
.leaflet-zoom-anim .leaflet-zoom-animated {
  transition: transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}
/* Polygon transitions (no 'd' transition — causes massive repaints) */
.leaflet-overlay-pane svg path {
  transition: stroke-width 0.3s ease, fill-opacity 0.3s ease, opacity 0.3s ease;
}
/* Marker transitions */
.leaflet-marker-pane .leaflet-marker-icon {
  transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.5s ease;
}
/* Custom teardrop cluster icons */
.custom-cluster-icon {
  background: transparent !important;
  border: none !important;
}
/* Hide default cluster styles */
.marker-cluster {
  background: transparent !important;
  border: none !important;
}
.marker-cluster div {
  background: transparent !important;
}
/* Spiderfy animation - smooth spread */
.leaflet-marker-icon.leaflet-interactive {
  transition: transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.5s ease;
}
/* Cluster appear/disappear animation */
@keyframes clusterFadeIn {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes clusterFadeOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.5); }
}
.marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
  animation: clusterFadeIn 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}
/* Smooth cluster icon transitions */
.custom-cluster-icon {
  transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.5s ease !important;
}
/* Smooth pane transitions for level switching */
.leaflet-marker-pane {
  transition: opacity 0.6s ease;
}
.leaflet-overlay-pane {
  transition: opacity 0.4s ease;
}
/* Smooth marker cluster group transitions */
.leaflet-cluster-anim .leaflet-marker-icon,
.leaflet-cluster-anim .leaflet-marker-shadow {
  transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.5s ease !important;
}
/* Cadastral number labels on polygons */
.cadastral-label {
  background: rgba(255, 255, 255, 0.9) !important;
  border: none !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
  padding: 2px 6px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #333 !important;
  border-radius: 3px !important;
}
.cadastral-label::before {
  display: none !important;
}
/* Custom popup styles */
.leaflet-popup-content-wrapper {
  border-radius: 12px !important;
  padding: 0 !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
  min-width: 320px !important;
}
.leaflet-popup-content {
  margin: 16px 20px !important;
  margin-right: 35px !important;
  font-family: inherit !important;
  width: auto !important;
}
.leaflet-popup-close-button {
  top: 12px !important;
  right: 12px !important;
  width: 24px !important;
  height: 24px !important;
  font-size: 22px !important;
  line-height: 24px !important;
  color: #94a3b8 !important;
  z-index: 10 !important;
}
.leaflet-popup-close-button:hover {
  color: #475569 !important;
}
.leaflet-popup-tip {
  display: none !important;
}
`

// Create teardrop marker SVG with specified color
function createTeardropSvg(color: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="28" height="38">
        <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/>
            </filter>
        </defs>
        <path fill="${color}" filter="url(#shadow)" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"/>
        <circle fill="white" cx="12" cy="11" r="4"/>
    </svg>`
}

// Create teardrop cluster SVG with count inside
function createClusterTeardropSvg(color: string, count: number): string {
    const fontSize = count >= 100 ? 8 : count >= 10 ? 10 : 12
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="42" height="56">
        <defs>
            <filter id="cshadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
            </filter>
        </defs>
        <path fill="${color}" filter="url(#cshadow)" d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 30 18 30s18-16.5 18-30c0-9.9-8.1-18-18-18z"/>
        <circle fill="white" cx="18" cy="16" r="12"/>
        <text x="18" y="${16 + fontSize / 3}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}">${count}</text>
    </svg>`
}

// Create cluster icon with teardrop shape - always green
function createClusterIcon(cluster: any) {
    const count = cluster.getChildCount()
    const color = "#22c55e"  // always green

    return L.divIcon({
        html: createClusterTeardropSvg(color, count),
        className: 'custom-cluster-icon',
        iconSize: L.point(42, 56),
        iconAnchor: L.point(21, 56),
    })
}

// Colored teardrop marker icons
const MarkerIcons = {
    ownership: L.icon({
        iconUrl: "data:image/svg+xml;base64," + btoa(createTeardropSvg("#22c55e")),  // emerald green
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -38],
    }),
    lease: L.icon({
        iconUrl: "data:image/svg+xml;base64," + btoa(createTeardropSvg("#3b82f6")),  // blue
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -38],
    }),
    reserved: L.icon({
        iconUrl: "data:image/svg+xml;base64," + btoa(createTeardropSvg("#f97316")),  // orange
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -38],
    }),
    bundle: L.icon({
        iconUrl: "data:image/svg+xml;base64," + btoa(createTeardropSvg("#8b5cf6")),  // purple
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -38],
    }),
}

// Get color string for plot type
function getPlotColorString(plot: LandPlot): string {
    if (plot.is_reserved) return "#f97316"  // orange

    // Check for lease type (in ownership_type OR in title)
    const ownershipType = String(plot.ownership_type || "").toLowerCase()
    const title = String(plot.title || "").toLowerCase()
    const isLease = ownershipType.includes("lease") || ownershipType.includes("аренд") || title.includes("аренда")

    if (isLease) return "#3b82f6"  // blue (lease)
    if ((plot as any).bundle_id) return "#8b5cf6"  // purple (bundle)

    return "#22c55e"  // green (ownership)
}

// Extract last part of cadastral number (e.g., "39:03:060012:3698" -> "3698")
function getCadastralSuffix(cadastralNumber: string | null | undefined): string {
    if (!cadastralNumber) return ""
    const parts = cadastralNumber.split(":")
    return parts[parts.length - 1] || ""
}

// Create simple dot marker with cadastral suffix label
function createDotMarker(plot: LandPlot): L.DivIcon {
    const color = getPlotColorString(plot)
    const suffix = getCadastralSuffix(plot.cadastral_number)

    return L.divIcon({
        html: `
            <div style="
                width: 14px;
                height: 14px;
                background: ${color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
        `,
        className: 'dot-marker',
        iconSize: L.point(14, 14),
        iconAnchor: L.point(7, 7),
        popupAnchor: L.point(0, -10),
    })
}

// Function to get appropriate marker icon based on plot type (for clusters/teardrop)
function getPlotIcon(plot: LandPlot): L.Icon {
    if (plot.is_reserved) return MarkerIcons.reserved
    if ((plot as any).bundle_id) return MarkerIcons.bundle
    if (String(plot.ownership_type || "ownership") === "lease") return MarkerIcons.lease
    return MarkerIcons.ownership
}

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

// Colors for different plot types (for polygons)
const COLORS = {
    ownership: "#22c55e",   // emerald green
    lease: "#3b82f6",       // blue
    reserved: "#f97316",    // orange
    bundle: "#8b5cf6",      // purple
    selected: "#dc2626",    // red for selected bundle outline
    selectedFill: "#fecaca", // light red fill
}

interface LeafletCatalogMapProps {
    plots: LandPlot[]
    selectedPlotId: string | null
    onSelectPlot?: (id: string | null) => void
}

// Convert coordinates from various formats to [lat, lon]
function convertCoords(coords: any): [number, number] {
    if (!coords || !Array.isArray(coords)) return [0, 0]

    const x = coords[0]
    const y = coords[1]

    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
        return [0, 0]
    }

    // Already in [lon, lat] format
    if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
        return [y, x]
    }

    // Already in [lat, lon] format
    if (Math.abs(x) <= 90 && Math.abs(y) <= 180) {
        return [x, y]
    }

    // EPSG:3857 -> EPSG:4326
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

// Get selection key - bundle plots share the same key
function getSelectionKey(plot: LandPlot): string {
    return (plot as any).bundle_id ? `bundle:${(plot as any).bundle_id}` : `plot:${plot.id}`
}

// Get color based on plot status (ownership_type)
function getPlotColor(plot: LandPlot): string {
    if (plot.is_reserved) return COLORS.reserved
    // Color by ownership type: green for ownership, blue for lease
    const ownershipType = String(plot.ownership_type || "").toLowerCase()
    const title = String(plot.title || "").toLowerCase()
    if (ownershipType.includes("lease") || ownershipType.includes("аренд") || title.includes("аренда")) {
        return COLORS.lease  // blue
    }
    return COLORS.ownership  // green
}



// Fly to selected plot when selection changes
function FlyToSelected({ plots, selectedPlotId }: { plots: ParsedPlot[]; selectedPlotId: string | null }) {
    const map = useMap()

    useEffect(() => {
        if (!map || !selectedPlotId) return

        const plot = plots.find(p => p.id === selectedPlotId)
        if (!plot) return

        // If plot has polygon, fit bounds to polygon
        if (plot.polygons.length > 0 && plot.polygons[0].length > 0) {
            const bounds = L.latLngBounds(plot.polygons.flat())
            map.flyToBounds(bounds, {
                padding: [50, 50],
                maxZoom: 17,
                duration: 1.2,
                easeLinearity: 0.25,
            })
        } else if (plot.center[0] !== 0 || plot.center[1] !== 0) {
            map.flyTo(plot.center, 16, { duration: 1.2, easeLinearity: 0.25 })
        }
    }, [map, selectedPlotId, plots])

    return null
}

function MapControls({ mapType, onToggleType }: { mapType: "satellite" | "scheme"; onToggleType: () => void }) {
    const map = useMap()

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
            <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white"
                onClick={() => {
                    const container = map.getContainer()
                    if (document.fullscreenElement) {
                        document.exitFullscreen()
                    } else {
                        container.requestFullscreen()
                    }
                }}
            >
                <Maximize2 className="h-4 w-4" />
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

function PlotPopupContent({ plot, bundlePlots }: { plot: LandPlot; bundlePlots: LandPlot[] }) {
    const isBundle = bundlePlots.length > 1
    const totalArea = isBundle
        ? bundlePlots.reduce((sum, p) => sum + (Number((p as any).area_sotok) || 0), 0)
        : plot.area_sotok

    // For bundles, use primary plot price (secondary plots have price 0)
    const primaryPlot = isBundle ? bundlePlots.find(p => (p as any).is_bundle_primary) || plot : plot
    const totalPrice = primaryPlot.price || plot.price

    const formatPrice = (p: number) => new Intl.NumberFormat("ru-RU").format(p) + " ₽"
    const slug = buildPlotSlug({ location: primaryPlot.location, district: primaryPlot.district, areaSotok: totalArea })

    // Determine ownership type text
    const ownershipType = String(primaryPlot.ownership_type || "").toLowerCase()
    const titleText = String(primaryPlot.title || "").toLowerCase()
    const isLease = ownershipType.includes("lease") || ownershipType.includes("аренд") || titleText.includes("аренда")
    const ownershipLabel = isLease ? "аренда" : "собственность"

    // Build display title: "Location, District (short)"
    const districtShort = primaryPlot.district
        ? primaryPlot.district
            .replace(/,?\s*Калининградская область/i, "")
            .replace(/\s+район/i, " (р-н)")
            .replace(/городской округ/i, "г.о.")
            .trim()
        : ""

    const addressParts = []
    if (primaryPlot.location) addressParts.push(primaryPlot.location)
    if (districtShort) addressParts.push(districtShort)

    const displayTitle = addressParts.length > 0
        ? addressParts.join(", ")
        : `Участок ${totalArea} сот.`

    // Get all plots info for bundle (cadastral + ownership)
    const allPlotsInfo = isBundle
        ? bundlePlots
            .filter(p => p.cadastral_number)
            .sort((a, b) => String(a.cadastral_number).localeCompare(String(b.cadastral_number)))
            .map(p => {
                const ot = String(p.ownership_type || "").toLowerCase()
                const title = String(p.title || "").toLowerCase()
                const isPlotLease = ot.includes("lease") || ot.includes("аренд") || title.includes("аренда")
                return {
                    cadastral: p.cadastral_number!,
                    ownershipLabel: isPlotLease ? "аренда" : "собственность",
                    isLease: isPlotLease
                }
            })
        : [{
            cadastral: primaryPlot.cadastral_number || "Без КН",
            ownershipLabel: ownershipLabel,
            isLease: isLease
        }]

    return (
        <div className="min-w-[280px] max-w-[400px] p-1">
            {/* Header with title and price */}
            <div className="flex justify-between items-start gap-3 mb-1">
                <h3 className="font-semibold text-base leading-tight">{displayTitle}</h3>
                <span className="text-emerald-600 font-bold text-base whitespace-nowrap">{formatPrice(totalPrice)}</span>
            </div>

            {/* Bundle badge */}
            {isBundle && (
                <div className="mb-2">
                    <span className="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded">
                        🔗 Продаются вместе ({bundlePlots.length} участков)
                    </span>
                </div>
            )}

            {/* Cadastral numbers with ownership type */}
            <div className="mb-3 space-y-1">
                {allPlotsInfo.map((info, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-slate-600">{info.cadastral}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${info.isLease ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {info.ownershipLabel}
                        </span>
                    </div>
                ))}
            </div>

            {/* Area */}
            <p className="text-sm text-slate-600 mb-4">
                {totalArea} сот.
            </p>

            {/* Buttons */}
            <div className="flex gap-3 mt-4">
                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('rkkland:viewing', { detail: { plotId: primaryPlot.id } }))}
                    className="flex-1 text-center bg-[#2dac6e] hover:bg-[#28a062] text-white rounded-lg py-3 px-4 text-sm font-medium transition-colors cursor-pointer border-none"
                >
                    Записаться на просмотр
                </button>
                <Link
                    href={buildPlotSeoPath({
                        district: primaryPlot.district,
                        location: primaryPlot.location,
                        intId: primaryPlot.int_id || primaryPlot.id,
                    })}
                    className="flex-1 text-center bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1e293b] rounded-lg py-3 px-4 text-sm font-medium transition-colors border border-slate-200"
                >
                    Открыть участок
                </Link>
            </div>
        </div >
    )
}

function FitBoundsToPlots({ plots }: { plots: Array<{ center: [number, number] }> }) {
    const map = useMap()

    useEffect(() => {
        const points = plots.map(p => p.center).filter(c => c[0] !== 0 && c[1] !== 0)
        if (points.length > 0) {
            const bounds = L.latLngBounds(points)
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        }
    }, [map, plots])

    return null
}

interface ParsedPlot extends LandPlot {
    polygons: Array<[number, number][]>
    center: [number, number]
    selectionKey: string
}

// Zoom level thresholds
const ZOOM_THRESHOLDS = {
    CLUSTER_MAX: 12,      // 0-12: Clusters (grouped markers)
    MARKER_MAX: 15,       // 13-15: Individual markers with spiderfy
    POLYGON_MIN: 16,      // 16+: Polygons, markers hidden
}

// Adaptive scroll zoom: faster scrolling = bigger zoom steps, slower = smaller steps
function AdaptiveScrollZoom() {
    const map = useMap()

    useEffect(() => {
        if (!map) return

        // Disable default scroll zoom
        map.scrollWheelZoom.disable()

        let accumulatedDelta = 0
        let lastWheelTime = 0
        let zoomTimeout: ReturnType<typeof setTimeout> | null = null

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            e.stopPropagation()

            const now = Date.now()
            const timeDiff = now - lastWheelTime
            lastWheelTime = now

            // Reset accumulator if pause > 200ms
            if (timeDiff > 200) {
                accumulatedDelta = 0
            }

            accumulatedDelta += Math.abs(e.deltaY)

            // Calculate zoom step based on scroll speed
            // Slow scroll (small delta) = 0.25 step, fast scroll = up to 1.5 steps
            const speed = Math.min(accumulatedDelta / 150, 1)  // 0..1
            const zoomStep = 0.25 + speed * 1.25  // 0.25..1.5

            const direction = e.deltaY > 0 ? -1 : 1

            if (zoomTimeout) clearTimeout(zoomTimeout)

            zoomTimeout = setTimeout(() => {
                const currentZoom = map.getZoom()
                const targetZoom = Math.round((currentZoom + direction * zoomStep) * 4) / 4  // snap to 0.25
                const mouseLatLng = map.containerPointToLatLng(
                    L.point(e.clientX - map.getContainer().getBoundingClientRect().left,
                            e.clientY - map.getContainer().getBoundingClientRect().top)
                )
                map.setZoomAround(mouseLatLng, targetZoom, { animate: true })
                accumulatedDelta = 0
            }, 30)
        }

        const container = map.getContainer()
        container.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            container.removeEventListener('wheel', handleWheel)
            if (zoomTimeout) clearTimeout(zoomTimeout)
            map.scrollWheelZoom.enable()
        }
    }, [map])

    return null
}

// ZoomTracker component to track current zoom level and map bounds for viewport culling
function ZoomTracker({ onZoomChange, onBoundsChange }: { onZoomChange: (zoom: number) => void; onBoundsChange?: (bounds: L.LatLngBounds) => void }) {
    const map = useMap()

    useEffect(() => {
        if (!map) return

        const handleChange = () => {
            onZoomChange(map.getZoom())
            onBoundsChange?.(map.getBounds())
        }

        // Set initial values
        handleChange()

        map.on('zoomend', handleChange)
        map.on('zoom', handleChange)
        map.on('moveend', handleChange)
        return () => {
            map.off('zoomend', handleChange)
            map.off('zoom', handleChange)
            map.off('moveend', handleChange)
        }
    }, [map, onZoomChange, onBoundsChange])

    return null
}

// Smoothly fade marker pane opacity based on zoom level (fade out near polygon threshold)
function MarkerPaneFader({ currentZoom }: { currentZoom: number }) {
    const map = useMap()

    useEffect(() => {
        if (!map) return
        const pane = map.getPane('markerPane')
        if (!pane) return

        // Fade markers between zoom 15 and 16
        const fadeStart = ZOOM_THRESHOLDS.POLYGON_MIN - 1  // 15
        const fadeEnd = ZOOM_THRESHOLDS.POLYGON_MIN         // 16

        if (currentZoom >= fadeEnd) {
            pane.style.opacity = '0'
            pane.style.pointerEvents = 'none'
        } else if (currentZoom > fadeStart) {
            const progress = (currentZoom - fadeStart) / (fadeEnd - fadeStart)
            pane.style.opacity = String(1 - progress)
            pane.style.pointerEvents = 'auto'
        } else {
            pane.style.opacity = '1'
            pane.style.pointerEvents = 'auto'
        }
    }, [map, currentZoom])

    return null
}

export function LeafletCatalogMap({ plots, selectedPlotId, onSelectPlot }: LeafletCatalogMapProps) {
    const [mounted, setMounted] = useState(false)
    const [mapType, setMapType] = useState<"satellite" | "scheme">("scheme")
    const [currentZoom, setCurrentZoom] = useState(10)
    const [hoveredKey, setHoveredKey] = useState<string | null>(null)
    const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null)
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

    // Viewing form state
    const [viewingOpen, setViewingOpen] = useState(false)
    const [viewingPlot, setViewingPlot] = useState<LandPlot | null>(null)
    const [viewingName, setViewingName] = useState("")
    const [viewingPhone, setViewingPhone] = useState("")
    const [viewingMessenger, setViewingMessenger] = useState<"max" | "telegram" | "whatsapp" | "">("")
    const [viewingConsent, setViewingConsent] = useState(false)
    const [viewingState, setViewingState] = useState<"idle" | "loading" | "success" | "error">("idle")
    const [viewingError, setViewingError] = useState("")

    // Phone mask formatter: +7 (XXX) XXX-XX-XX
    const formatPhone = useCallback((value: string) => {
        // Remove all non-digits
        let digits = value.replace(/\D/g, "")

        // If starts with 8, replace with 7
        if (digits.startsWith("8")) {
            digits = "7" + digits.slice(1)
        }
        // If doesn't start with 7, prepend 7
        if (digits.length > 0 && !digits.startsWith("7")) {
            digits = "7" + digits
        }

        // Limit to 11 digits (7 + 10 digits for Russian number)
        digits = digits.slice(0, 11)

        // Format: +7 (XXX) XXX-XX-XX
        if (digits.length === 0) return ""
        if (digits.length <= 1) return "+7"
        if (digits.length <= 4) return `+7 (${digits.slice(1)}`
        if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
        if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
        return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
    }, [])

    const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value)
        setViewingPhone(formatted)
    }, [formatPhone])

    useEffect(() => {
        setMounted(true)
    }, [])

    // Handle viewing event from popup button
    useEffect(() => {
        const handler = (e: any) => {
            const plotId = String(e?.detail?.plotId || "")
            if (!plotId) return
            const plot = plots.find((p) => p.id === plotId) || null
            setViewingPlot(plot)
            setViewingOpen(true)
            setViewingState("idle")
            setViewingError("")
            setViewingConsent(false)
            setViewingPhone("") // Reset phone
            setViewingName("") // Reset name
        }
        window.addEventListener("rkkland:viewing", handler as any)
        return () => window.removeEventListener("rkkland:viewing", handler as any)
    }, [plots])

    const toggleMapType = useCallback(() => {
        setMapType(prev => prev === "satellite" ? "scheme" : "satellite")
    }, [])

    const handleZoomChange = useCallback((zoom: number) => {
        setCurrentZoom(zoom)
    }, [])

    const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
        setMapBounds(bounds)
    }, [])

    // Build bundle lookup
    const bundlePlotsById = useMemo(() => {
        const map = new Map<string, LandPlot[]>()
        plots.forEach(p => {
            const bid = (p as any).bundle_id
            if (!bid) return
            const arr = map.get(bid) || []
            arr.push(p)
            map.set(bid, arr)
        })
        return map
    }, [plots])

    // Get selected key based on selected plot
    const selectedKey = useMemo(() => {
        if (!selectedPlotId) return null
        const selectedPlot = plots.find(p => p.id === selectedPlotId)
        if (!selectedPlot) return null
        return getSelectionKey(selectedPlot)
    }, [plots, selectedPlotId])

    // Parse plot coordinates
    const parsedPlots = useMemo((): ParsedPlot[] => {
        return plots
            .filter(p => p.center_lat && p.center_lon || p.coordinates_json)
            .map(plot => {
                const polygons: Array<[number, number][]> = []

                if (plot.coordinates_json) {
                    try {
                        let geom = typeof plot.coordinates_json === "string"
                            ? JSON.parse(plot.coordinates_json)
                            : plot.coordinates_json

                        if (geom?.type === "Polygon" && geom?.coordinates) {
                            const ring = convertCoordsArray(geom.coordinates[0]) as [number, number][]
                            if (ring.length > 0) polygons.push(ring)
                        } else if (geom?.type === "MultiPolygon" && geom?.coordinates) {
                            for (const poly of geom.coordinates) {
                                const ring = convertCoordsArray(poly[0]) as [number, number][]
                                if (ring.length > 0) polygons.push(ring)
                            }
                        } else if (geom?.coordinates && Array.isArray(geom.coordinates[0])) {
                            const ring = convertCoordsArray(geom.coordinates[0]) as [number, number][]
                            if (ring.length > 0) polygons.push(ring)
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                let center: [number, number] = [0, 0]
                if (plot.center_lat && plot.center_lon) {
                    center = [plot.center_lat, plot.center_lon]
                } else if (polygons.length > 0 && polygons[0].length > 0) {
                    const ring = polygons[0]
                    center = [
                        ring.reduce((sum, p) => sum + p[0], 0) / ring.length,
                        ring.reduce((sum, p) => sum + p[1], 0) / ring.length
                    ]
                }

                return {
                    ...plot,
                    polygons,
                    center,
                    selectionKey: getSelectionKey(plot),
                }
            })
            .filter(p => p.center[0] !== 0 || p.center[1] !== 0 || p.polygons.length > 0)
    }, [plots])

    if (!mounted) {
        return (
            <div className="w-full h-full min-h-[400px] bg-slate-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Загрузка карты...</p>
                </div>
            </div>
        )
    }

    const defaultCenter: [number, number] = [54.7104, 20.5101]

    return (
        <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden">
            <MapContainer
                center={defaultCenter}
                zoom={10}
                className="absolute inset-0 z-0"
                zoomControl={false}
                attributionControl={false}
                scrollWheelZoom={false}
                zoomSnap={0.25}
                zoomDelta={0.5}
                wheelPxPerZoomLevel={250}
                fadeAnimation={true}
                zoomAnimation={true}
                zoomAnimationThreshold={6}
                preferCanvas={true}
            >
                <style>{smoothCSS}</style>
                <TileLayer
                    key={mapType}
                    url={TILE_LAYERS[mapType].url}
                    attribution={TILE_LAYERS[mapType].attribution}
                    keepBuffer={4}
                    updateWhenZooming={true}
                    updateWhenIdle={false}
                />

                {/* Polygons - only render at zoom >= 14 and only those in viewport */}
                {currentZoom >= 14 && parsedPlots.filter(p => {
                    if (p.polygons.length === 0) return false
                    // Viewport culling: skip polygons outside visible bounds (with padding)
                    if (mapBounds) {
                        const padded = mapBounds.pad(0.3)
                        if (!padded.contains(L.latLng(p.center[0], p.center[1]))) return false
                    }
                    return true
                }).map(plot => {
                    const isSelected = selectedKey !== null && plot.selectionKey === selectedKey
                    const isHovered = !isTouchDevice && hoveredKey !== null && plot.selectionKey === hoveredKey
                    const color = getPlotColor(plot)
                    const bundlePlots = bundlePlotsById.get((plot as any).bundle_id) || [plot]

                    const isDetailLevel = currentZoom >= ZOOM_THRESHOLDS.POLYGON_MIN
                    const isHighlighted = isSelected || isHovered
                    // Smooth opacity ramp between zoom 14 and 16
                    const zoomProgress = Math.min(1, Math.max(0, (currentZoom - 14) / 2))
                    const baseFillOpacity = 0.25 + zoomProgress * 0.25  // 0.25 → 0.5
                    const fillOpacity = isSelected ? 0.7 : (isHovered ? 0.55 : baseFillOpacity)
                    const baseStrokeWeight = 1.5 + zoomProgress * 1.5  // 1.5 → 3
                    const strokeWeight = isHighlighted ? 4 : baseStrokeWeight

                    return plot.polygons.map((ring, idx) => (
                        <Polygon
                            key={`${plot.id}-${idx}`}
                            positions={ring}
                            pathOptions={{
                                fillColor: color,
                                fillOpacity: isSelected ? 0.7 : fillOpacity,
                                color: isHighlighted ? (isSelected ? COLORS.selected : "#8b5cf6") : color,
                                weight: strokeWeight,
                            }}
                            eventHandlers={{
                                click: () => onSelectPlot?.(plot.id),
                                ...(isTouchDevice ? {} : {
                                    mouseover: () => setHoveredKey(plot.selectionKey),
                                    mouseout: () => setHoveredKey(null),
                                }),
                            }}
                        >
                            <Popup>
                                <PlotPopupContent plot={plot} bundlePlots={bundlePlots} />
                            </Popup>
                            {/* Show cadastral suffix on detail zoom level */}
                            {isDetailLevel && plot.cadastral_number && (
                                <Tooltip
                                    direction="center"
                                    permanent
                                    className="cadastral-label"
                                >
                                    {getCadastralSuffix(plot.cadastral_number)}
                                </Tooltip>
                            )}
                        </Polygon>
                    ))
                })}

                <MarkerPaneFader currentZoom={currentZoom} />

                {/* Markers with clustering - fade out smoothly near polygon level */}
                {currentZoom < ZOOM_THRESHOLDS.POLYGON_MIN + 0.5 && (
                    <MarkerClusterGroup
                        chunkedLoading
                        spiderfyOnMaxZoom={false}
                        showCoverageOnHover={false}
                        maxClusterRadius={50}
                        disableClusteringAtZoom={ZOOM_THRESHOLDS.CLUSTER_MAX + 1}
                        animate={true}
                        animateAddingMarkers={false}
                        zoomToBoundsOnClick={true}
                        removeOutsideVisibleBounds={true}
                        iconCreateFunction={createClusterIcon}
                    >
                        {parsedPlots.map(plot => {
                            const bundlePlots = bundlePlotsById.get((plot as any).bundle_id) || [plot]

                            return (
                                <Marker
                                    key={plot.id}
                                    position={plot.center}
                                    icon={createDotMarker(plot)}
                                    eventHandlers={{
                                        click: () => onSelectPlot?.(plot.id),
                                        ...(isTouchDevice ? {} : {
                                            mouseover: () => setHoveredKey(plot.selectionKey),
                                            mouseout: () => setHoveredKey(null),
                                        }),
                                    }}
                                >
                                    <Popup>
                                        <PlotPopupContent plot={plot} bundlePlots={bundlePlots} />
                                    </Popup>
                                </Marker>
                            )
                        })}
                    </MarkerClusterGroup>
                )}

                <AdaptiveScrollZoom />
                <FitBoundsToPlots plots={parsedPlots} />
                <ZoomTracker onZoomChange={handleZoomChange} onBoundsChange={handleBoundsChange} />
                <FlyToSelected plots={parsedPlots} selectedPlotId={selectedPlotId} />
                <MapControls mapType={mapType} onToggleType={toggleMapType} />
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span>
                        <span>Собственность</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#3b82f6]"></span>
                        <span>Аренда</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#f97316]"></span>
                        <span>Забронирован</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span>
                        <span>Комплекс</span>
                    </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t">
                    <span>🗺️ {parsedPlots.length} участков</span>
                    <span className="font-medium">
                        {currentZoom >= ZOOM_THRESHOLDS.POLYGON_MIN
                            ? "📐 Контуры"
                            : currentZoom > ZOOM_THRESHOLDS.CLUSTER_MAX
                                ? "📍 Маркеры"
                                : "🔘 Кластеры"
                        }
                    </span>
                </div>
            </div>

            {/* Viewing booking dialog */}
            <Dialog open={viewingOpen} onOpenChange={setViewingOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Записаться на просмотр</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {viewingPlot && (
                            <div className="text-sm text-slate-600">
                                <div className="font-semibold text-slate-900">{viewingPlot.title || "Участок"}</div>
                                <div className="font-mono text-xs">{viewingPlot.cadastral_number || ""}</div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>ФИО</Label>
                            <Input value={viewingName} onChange={(e) => setViewingName(e.target.value)} placeholder="Иван Иванов" />
                        </div>

                        <div className="grid gap-2">
                            <Label>Телефон</Label>
                            <Input
                                type="tel"
                                inputMode="numeric"
                                value={viewingPhone}
                                onChange={handlePhoneChange}
                                placeholder="+7 (___) ___-__-__"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Предпочтительный мессенджер</Label>
                            <Select value={viewingMessenger} onValueChange={(v) => setViewingMessenger(v as any)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="max">MAX</SelectItem>
                                    <SelectItem value="telegram">Telegram</SelectItem>
                                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-start gap-2">
                            <Checkbox checked={viewingConsent} onCheckedChange={(v) => setViewingConsent(Boolean(v))} />
                            <div className="text-xs text-slate-600 leading-snug">
                                Я ознакомлен(а) с обработкой персональных данных
                            </div>
                        </div>

                        {viewingState === "success" ? (
                            <div className="text-sm text-emerald-700">Заявка отправлена. Мы свяжемся с вами.</div>
                        ) : (
                            <>
                                {viewingState === "error" && <div className="text-sm text-red-600">{viewingError || "Ошибка отправки"}</div>}
                                <Button
                                    disabled={viewingState === "loading"}
                                    onClick={async () => {
                                        setViewingError("")
                                        if (!viewingPlot?.id) {
                                            setViewingState("error")
                                            setViewingError("Не выбран участок")
                                            return
                                        }
                                        if (!viewingConsent) {
                                            setViewingState("error")
                                            setViewingError("Подтвердите согласие на обработку персональных данных")
                                            return
                                        }
                                        if (!viewingPhone.trim()) {
                                            setViewingState("error")
                                            setViewingError("Укажите телефон")
                                            return
                                        }

                                        setViewingState("loading")
                                        try {
                                            const res = await fetch("/api/public/viewing-lead", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    name: viewingName,
                                                    phone: viewingPhone,
                                                    messenger_telegram: viewingMessenger === "telegram",
                                                    messenger_whatsapp: viewingMessenger === "whatsapp",
                                                    messenger_max: viewingMessenger === "max",
                                                    consent: viewingConsent,
                                                    plot: {
                                                        id: viewingPlot.id,
                                                        location: viewingPlot.location,
                                                        cadastral_number: viewingPlot.cadastral_number,
                                                        price: viewingPlot.price,
                                                        area_sotok: viewingPlot.area_sotok,
                                                    },
                                                }),
                                            })

                                            const json = await res.json().catch(() => null)
                                            if (!res.ok || !json?.success) {
                                                throw new Error(json?.error || `HTTP ${res.status}`)
                                            }
                                            setViewingState("success")
                                        } catch (e: any) {
                                            setViewingState("error")
                                            setViewingError(String(e?.message || e))
                                        }
                                    }}
                                >
                                    {viewingState === "loading" ? "Отправка..." : "Отправить"}
                                </Button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
