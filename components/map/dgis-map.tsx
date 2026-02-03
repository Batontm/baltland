"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { type LandPlot, type MapSettings } from "@/lib/types"

interface DGisMapProps {
    plots: LandPlot[]
    selectedPlotId: string | null
    selectedSettlement: string | null
    onSelectPlot?: (id: string | null) => void
    mapSettings?: MapSettings | null
}

declare global {
    interface Window {
        L: any
    }
}

export function DGisMap({ plots, selectedPlotId, selectedSettlement, onSelectPlot, mapSettings }: DGisMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<any>(null)
    const polygonLayers = useRef<Record<string, any>>({})
    const markerClusterRef = useRef<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isLeafletLoaded, setIsLeafletLoaded] = useState(false)
    const [isMarkerClusterLoaded, setIsMarkerClusterLoaded] = useState(false)

    const getPlotStatusColor = (plot: LandPlot) => {
        const ownershipColor = mapSettings?.ownership_polygon_color ?? mapSettings?.polygon_color ?? "#10b981"
        const leaseColor = mapSettings?.lease_polygon_color ?? "#f97316"
        const reservedColor = mapSettings?.reserved_polygon_color ?? "#64748b"

        if (plot.is_reserved) return reservedColor
        if (String(plot.ownership_type || "ownership") === "lease") return leaseColor
        return ownershipColor
    }

    const getPlotOutlineColor = (plot: LandPlot) => {
        const bundleColor = mapSettings?.bundle_polygon_color ?? "#3b82f6"
        return plot.bundle_id ? bundleColor : getPlotStatusColor(plot)
    }

    // Marker color: keep existing behavior where bundle markers are highlighted with bundle color
    const getPlotBaseColor = (plot: LandPlot) => {
        const bundleColor = mapSettings?.bundle_polygon_color ?? "#3b82f6"
        if (plot.bundle_id) return bundleColor
        return getPlotStatusColor(plot)
    }

    const getSelectionKey = (plot: LandPlot) => {
        return plot.bundle_id ? `bundle:${plot.bundle_id}` : `plot:${plot.id}`
    }

    const getSelectedKey = () => {
        if (!selectedPlotId) return null
        const selectedPlot = plots.find(p => p.id === selectedPlotId)
        if (!selectedPlot) return null
        return getSelectionKey(selectedPlot)
    }

    const getLayerKey = (plot: LandPlot) => {
        const key = getSelectionKey(plot)
        return `${key}:${plot.id}`
    }

    const parseLayerKey = (layerKey: string): { selectionKey: string; plotId: string } | null => {
        const parts = layerKey.split(":")
        if (parts.length < 3) return null
        const plotId = parts[parts.length - 1]
        const selectionKey = parts.slice(0, -1).join(":")
        return { selectionKey, plotId }
    }

    // Refs to track prop changes for auto-fit logic
    const lastPlotsRef = useRef<LandPlot[]>([])
    const lastSettlementRef = useRef<string | null>(null)
    const lastSelectedPlotRef = useRef<string | null>(null)
    const needsFitRef = useRef(false)

    // Load Leaflet from CDN
    useEffect(() => {
        if (typeof window === "undefined") return

        if (window.L) {
            setIsLeafletLoaded(true)
            return
        }

        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)

        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.onload = () => setIsLeafletLoaded(true)
        document.head.appendChild(script)

        return () => {
            if (document.head.contains(link)) document.head.removeChild(link)
        }
    }, [])

    // Load Leaflet.markercluster plugin from CDN (depends on Leaflet)
    useEffect(() => {
        if (typeof window === "undefined") return
        if (!isLeafletLoaded) return

        const L = (window as any).L
        if (L?.markerClusterGroup) {
            setIsMarkerClusterLoaded(true)
            return
        }

        const css = document.createElement("link")
        css.rel = "stylesheet"
        css.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
        document.head.appendChild(css)

        const cssDefault = document.createElement("link")
        cssDefault.rel = "stylesheet"
        cssDefault.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
        document.head.appendChild(cssDefault)

        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"
        script.onload = () => setIsMarkerClusterLoaded(true)
        document.head.appendChild(script)

        return () => {
            if (document.head.contains(css)) document.head.removeChild(css)
            if (document.head.contains(cssDefault)) document.head.removeChild(cssDefault)
            // do not remove script to avoid re-loading during navigation
        }
    }, [isLeafletLoaded])

    // Initialize Map
    useEffect(() => {
        if (!isLeafletLoaded || !mapRef.current || mapInstance.current) return

        const L = window.L

        const initialLat = mapSettings?.initial_center_lat ?? 54.7104
        const initialLon = mapSettings?.initial_center_lon ?? 20.5101
        const initialZoom = mapSettings?.initial_zoom ?? 10

        // Create map instance centered on Kaliningrad by default
        mapInstance.current = L.map(mapRef.current, {
            attributionControl: false
        }).setView([initialLat, initialLon], initialZoom)

        // Add 2GIS Tiles
        L.tileLayer("https://tile{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.1", {
            subdomains: "1234",
            attribution: "&copy; 2GIS",
            maxZoom: 18,
        }).addTo(mapInstance.current)

        // Initialize marker cluster group once (will start working once plugin is loaded)
        // NOTE: if plugin isn't loaded yet, we create it later in a separate effect.
        if (!markerClusterRef.current && (L as any).markerClusterGroup) {
            markerClusterRef.current = (L as any).markerClusterGroup({
                chunkedLoading: true,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                removeOutsideVisibleBounds: true,
                maxClusterRadius: 50,
            })
            markerClusterRef.current.addTo(mapInstance.current)
        }

        // Force resize fix
        setTimeout(() => {
            if (mapInstance.current) mapInstance.current.invalidateSize()
        }, 100)

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove()
                mapInstance.current = null
            }
        }
    }, [isLeafletLoaded, mapSettings?.initial_center_lat, mapSettings?.initial_center_lon, mapSettings?.initial_zoom])

    // Ensure marker cluster group is created once plugin becomes available
    useEffect(() => {
        if (!isLeafletLoaded || !isMarkerClusterLoaded) return
        if (!mapInstance.current) return
        if (markerClusterRef.current) return

        const L = (window as any).L
        if (!(L as any)?.markerClusterGroup) return

        markerClusterRef.current = (L as any).markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            removeOutsideVisibleBounds: true,
            maxClusterRadius: 50,
        })
        markerClusterRef.current.addTo(mapInstance.current)
    }, [isLeafletLoaded, isMarkerClusterLoaded])

    // State for zoom level to trigger re-renders
    const [zoom, setZoom] = useState(10)

    // Stable zoom listener
    useEffect(() => {
        if (!isLeafletLoaded || !mapInstance.current) return;
        const handleSyncZoom = () => {
            const newZoom = mapInstance.current.getZoom();
            console.log("[DGisMap] Zoom sync:", newZoom);
            setZoom(newZoom);
        };
        mapInstance.current.on('zoomend', handleSyncZoom);
        return () => {
            if (mapInstance.current) mapInstance.current.off('zoomend', handleSyncZoom);
        };
    }, [isLeafletLoaded]);

    // Update Polygons and Markers
    useEffect(() => {
        // Track if we need to auto-fit because internal filters or selection changed
        const plotsChanged = JSON.stringify(plots.map(p => p.id)) !== JSON.stringify(lastPlotsRef.current.map(p => p.id))
        const settlementChanged = selectedSettlement !== lastSettlementRef.current
        const selectionChanged = selectedPlotId !== lastSelectedPlotRef.current

        if (plotsChanged || settlementChanged || selectionChanged) {
            needsFitRef.current = true
            lastPlotsRef.current = plots
            lastSettlementRef.current = selectedSettlement
            lastSelectedPlotRef.current = selectedPlotId
        }

        console.log("[DGisMap] Update effect", { zoom, plotsCount: plots.length, needsFit: needsFitRef.current })
        if (!isLeafletLoaded || !mapInstance.current || !window.L) {
            console.log("[DGisMap] Skipping update: leaflet not loaded or map instance missing")
            return
        }

        const L = window.L

        // Conversion function from EPSG:3857 to EPSG:4326
        const convertCoords = (coords: any): any => {
            try {
                if (!coords || !Array.isArray(coords)) {
                    throw new Error("Coordinates are missing or not an array");
                }

                if (Array.isArray(coords[0])) {
                    return coords.map(convertCoords)
                }

                const x = coords[0]
                const y = coords[1]

                if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
                    throw new Error(`Invalid coordinate components: x=${x}, y=${y}`);
                }

                const lon = (x * 180) / 20037508.34
                let lat = (y * 180) / 20037508.34
                lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2)

                if (isNaN(lat) || isNaN(lon)) {
                    throw new Error(`Coordinate conversion resulted in NaN: lat=${lat}, lon=${lon}`);
                }

                return [lat, lon] // Leaflet uses [lat, lng]
            } catch (e) {
                // We'll log the error where it's called to have context (plot id, etc.)
                throw e
            }
        }

        // Helper to extract a single [lat, lon] point from potentially nested coordinates
        const getLeafPoint = (coords: any): [number, number] | null => {
            if (!coords || !Array.isArray(coords) || coords.length === 0) return null;
            if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                return [coords[0], coords[1]];
            }
            return getLeafPoint(coords[0]);
        }

        const getPlotCenter = (plot: LandPlot): [number, number] | null => {
            if (typeof plot.center_lat === "number" && typeof plot.center_lon === "number") {
                if (!isNaN(plot.center_lat) && !isNaN(plot.center_lon)) return [plot.center_lat, plot.center_lon]
            }

            if (plot.coordinates_json?.coordinates) {
                try {
                    const leafCoords = convertCoords(plot.coordinates_json.coordinates)
                    return getLeafPoint(leafCoords)
                } catch (e) {
                    return null
                }
            }

            return null
        }

        // Initialize and Clear existing markers/labels
        try {
            if (markerClusterRef.current?.clearLayers) {
                markerClusterRef.current.clearLayers()
            }

            // Clear existing polygons
            console.log("[DGisMap] Clearing existing polygons:", Object.keys(polygonLayers.current).length);
            Object.values(polygonLayers.current).forEach((layer: any) => {
                if (mapInstance.current) {
                    try { mapInstance.current.removeLayer(layer); } catch (e) { }
                }
            });
            polygonLayers.current = {};
        } catch (e) {
            console.error("[DGisMap] Error clearing layers:", e)
        }

        const currentZoom = mapInstance.current.getZoom()
        const clusterZoomThreshold = mapSettings?.cluster_zoom_threshold ?? 14
        const detailZoomThreshold = mapSettings?.detail_zoom_threshold ?? 16
        const isSettlementClusterView = currentZoom < clusterZoomThreshold
        const isDetailView = currentZoom >= detailZoomThreshold

        const polygonColor = mapSettings?.polygon_color ?? "#10b981"
        const polygonFillColor = mapSettings?.polygon_fill_color ?? polygonColor
        const polygonFillOpacity = mapSettings?.polygon_fill_opacity ?? 0.25
        const polygonWeight = mapSettings?.polygon_weight ?? 1.5

        const selectedPolygonColor = mapSettings?.selected_polygon_color ?? "#ef4444"
        const selectedPolygonFillColor = mapSettings?.selected_polygon_fill_color ?? selectedPolygonColor
        const selectedPolygonFillOpacity = mapSettings?.selected_polygon_fill_opacity ?? 0.5
        const selectedPolygonWeight = mapSettings?.selected_polygon_weight ?? 4

        const markerColor = mapSettings?.marker_color ?? polygonColor

        const showTooltip = mapSettings?.show_tooltip ?? true
        const tooltipShowTitle = mapSettings?.tooltip_show_title ?? true
        const tooltipShowCadastral = mapSettings?.tooltip_show_cadastral ?? true
        const tooltipShowPrice = mapSettings?.tooltip_show_price ?? true
        const tooltipShowArea = mapSettings?.tooltip_show_area ?? true
        const tooltipShowLandStatus = mapSettings?.tooltip_show_land_status ?? true
        const tooltipShowLocation = mapSettings?.tooltip_show_location ?? false
        const showMarkerLabels = mapSettings?.show_marker_labels ?? true
        const allBounds = L.latLngBounds([])
        let hasGeometries = false

        const addMarkerLayer = (marker: any) => {
            if (markerClusterRef.current?.addLayer) {
                markerClusterRef.current.addLayer(marker)
            } else {
                marker.addTo(mapInstance.current)
            }
        }

        try {
            if (isSettlementClusterView) {
                // Leaflet.markercluster handles low-zoom clustering efficiently
                console.log("[DGisMap] Rendering marker clusters...")
                plots.forEach((plot) => {
                    const center = getPlotCenter(plot)
                    if (!center) return

                    const key = getSelectionKey(plot)
                    const selectedKey = getSelectedKey()
                    const isSelected = selectedKey !== null && key === selectedKey
                    const baseColor = getPlotBaseColor(plot)

                    const marker = L.marker(center, {
                        icon: L.divIcon({
                            className: "plot-marker",
                            html: `
                                <div class="relative flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-sm">
                                        <path d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z" fill="${isSelected ? selectedPolygonColor : (mapSettings?.marker_color ?? baseColor)}" stroke="white" stroke-width="1.5"/>
                                    </svg>
                                </div>
                            `,
                            iconSize: [18, 18],
                            iconAnchor: [9, 18],
                        }),
                        interactive: true,
                        zIndexOffset: isSelected ? 1000 : 0,
                    })

                    marker.on("click", (e: any) => {
                        L.DomEvent.stopPropagation(e)
                        if (onSelectPlot) onSelectPlot(plot.id)
                    })

                    addMarkerLayer(marker)

                    allBounds.extend(center)
                    hasGeometries = true
                })
            } else {
                // Detailed Zoom - Show Polygons
                console.log("[DGisMap] Drawing detailed view for", plots.length, "plots")

                // Track positions for micro-clustering
                const plotMarkersToDraw: { center: [number, number], plot: LandPlot, isSelected: boolean }[] = []

                const selectedKey = getSelectedKey()
                const bundlePlotsById = new Map<string, LandPlot[]>()

                plots.forEach((p) => {
                    if (!p.bundle_id) return
                    const arr = bundlePlotsById.get(p.bundle_id) || []
                    arr.push(p)
                    bundlePlotsById.set(p.bundle_id, arr)
                })

                // Keep track of a hovered group to highlight all its polygons
                let hoveredKey: string | null = null
                const drawnBundleIds = new Set<string>()

                const applyGroupStyle = (key: string, isHover: boolean) => {
                    Object.entries(polygonLayers.current).forEach(([layerKey, layer]) => {
                        if (!layerKey.startsWith(key + ":")) return

                        const plotId = layerKey.split(":").pop() || ""
                        const plot = plots.find(p => p.id === plotId)
                        if (!plot) return

                        const outlineColor = getPlotOutlineColor(plot)
                        const statusColor = getPlotStatusColor(plot)
                        const isSelected = selectedKey !== null && key === selectedKey

                        layer.setStyle({
                            color: isSelected ? selectedPolygonColor : outlineColor,
                            fillColor: plot.bundle_id ? statusColor : (isSelected ? selectedPolygonFillColor : statusColor),
                            fillOpacity: isSelected
                                ? selectedPolygonFillOpacity
                                : (isHover ? Math.min(1, polygonFillOpacity + 0.15) : polygonFillOpacity),
                            weight: isSelected
                                ? selectedPolygonWeight
                                : (isHover ? Math.max(polygonWeight, polygonWeight + 1) : polygonWeight),
                        })
                    })
                }

                const drawSingle = (plot: LandPlot) => {
                    const key = getSelectionKey(plot)
                    const isSelected = selectedKey !== null && key === selectedKey
                    const outlineColor = getPlotOutlineColor(plot)
                    const statusColor = getPlotStatusColor(plot)
                    const plotCenter = getPlotCenter(plot)

                    // If we don't have polygon geometry, draw a marker only
                    if (!plot.coordinates_json) {
                        if (!plotCenter) return
                        plotMarkersToDraw.push({
                            center: plotCenter,
                            plot,
                            isSelected,
                        })
                        allBounds.extend(plotCenter)
                        hasGeometries = true
                        return
                    }

                    const leafCoords = convertCoords(plot.coordinates_json.coordinates)

                    const polygon = L.polygon(leafCoords, {
                        color: isSelected ? selectedPolygonColor : outlineColor,
                        fillColor: plot.bundle_id ? statusColor : (isSelected ? selectedPolygonFillColor : statusColor),
                        fillOpacity: isSelected ? selectedPolygonFillOpacity : polygonFillOpacity,
                        weight: isSelected ? selectedPolygonWeight : polygonWeight,
                    }).addTo(mapInstance.current)

                    polygon.on('click', (e: any) => {
                        L.DomEvent.stopPropagation(e)
                        if (onSelectPlot) onSelectPlot(plot.id)
                    })

                    polygon.on('mouseover', () => {
                        hoveredKey = key
                        applyGroupStyle(key, true)
                    })

                    polygon.on('mouseout', () => {
                        const prev = hoveredKey
                        hoveredKey = null
                        if (prev) applyGroupStyle(prev, false)
                    })

                    if (showTooltip) {
                        const bundleMembers = plot.bundle_id ? (bundlePlotsById.get(plot.bundle_id) || []) : []
                        const bundleTotalArea = plot.bundle_id
                            ? bundleMembers.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
                            : 0
                        const bundleTotalPrice = plot.bundle_id
                            ? bundleMembers.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
                            : 0
                        const bundleCadastralEntries = plot.bundle_id
                            ? bundleMembers
                                .slice()
                                .sort((a, b) => String(a.cadastral_number || "").localeCompare(String(b.cadastral_number || "")))
                                .map((p) => {
                                    const cn = String(p.cadastral_number || "").trim()
                                    if (!cn) return null
                                    const a = Number(p.area_sotok) || 0
                                    return `${cn} (${a} сот.)`
                                })
                                .filter((v): v is string => !!v)
                            : []

                        const parts: string[] = []
                        if (tooltipShowTitle) parts.push(`<div class="font-bold text-sm text-slate-800">${plot.title}</div>`)

                        const row: string[] = []
                        if (tooltipShowCadastral) {
                            if (plot.bundle_id && bundleCadastralEntries.length) {
                                row.push(`<span class="text-[10px] text-slate-500 font-mono">${bundleCadastralEntries.join('<br/>')}</span>`)
                            } else {
                                row.push(`<span class="text-[10px] text-slate-500 font-mono">${plot.cadastral_number || ''}</span>`)
                            }
                        }
                        if (tooltipShowPrice) {
                            const price = plot.bundle_id ? bundleTotalPrice : (Number(plot.price) || 0)
                            row.push(`<span class="text-xs font-semibold" style="color:${markerColor}">${price.toLocaleString()} ₽</span>`)
                        }
                        if (row.length) parts.push(`<div class="flex items-center justify-between gap-4">${row.join("")}</div>`)

                        const meta: string[] = []
                        if (tooltipShowArea) {
                            const area = plot.bundle_id ? bundleTotalArea : (Number(plot.area_sotok) || 0)
                            meta.push(`${area} сот.`)
                        }
                        if (tooltipShowLandStatus && plot.land_status) meta.push(`${plot.land_status}`)
                        if (tooltipShowLocation && plot.location) meta.push(`${plot.location}`)
                        if (meta.length) parts.push(`<div class="text-[10px] text-slate-400">${meta.join(" • ")}</div>`)

                        polygon.bindTooltip(`<div class="p-2 space-y-1">${parts.join("")}</div>`, {
                            sticky: true,
                            direction: 'top',
                            className: 'rounded-xl border-none shadow-xl'
                        })
                    }

                    const layerKey = `${key}:${plot.id}`
                    polygonLayers.current[layerKey] = polygon
                    allBounds.extend(polygon.getBounds())
                    hasGeometries = true

                    const polygonCenter = polygon.getBounds().getCenter()
                    plotMarkersToDraw.push({
                        center: [polygonCenter.lat, polygonCenter.lng],
                        plot,
                        isSelected
                    })
                }

                plots.forEach((plot) => {
                    try {
                        if (plot.bundle_id) {
                            if (drawnBundleIds.has(plot.bundle_id)) return
                            drawnBundleIds.add(plot.bundle_id)

                            const members = (bundlePlotsById.get(plot.bundle_id) || []).filter(p => !!p.coordinates_json)
                            members.forEach(drawSingle)
                            return
                        }

                        drawSingle(plot)
                    } catch (err) {
                        console.error(`[DGisMap] Error drawing plot ${plot.cadastral_number}:`, err)
                    }
                })

                // Group markers if they are overlapping significantly at current zoom
                // but if isDetailView (Zoom >= 16), be MUCH less aggressive
                const markersData: { center: [number, number], count: number, plots: LandPlot[] }[] = []
                const clusterThreshold = currentZoom >= detailZoomThreshold ? 0.0001 : 0.001

                plotMarkersToDraw.forEach(({ center, plot }) => {
                    let found = false
                    if (currentZoom < 17) { // Only micro-cluster if not very close
                        for (const cluster of markersData) {
                            if (Math.abs(cluster.center[0] - center[0]) < clusterThreshold &&
                                Math.abs(cluster.center[1] - center[1]) < clusterThreshold) {
                                cluster.plots.push(plot)
                                cluster.count++
                                found = true
                                break
                            }
                        }
                    }
                    if (!found) {
                        markersData.push({ center: [center[0], center[1]], count: 1, plots: [plot] })
                    }
                })

                // Render the icons (Counts or Cadastral Labels)
                markersData.forEach(data => {
                    const selectedKey = getSelectedKey()
                    const isSelected = data.plots.some(p => (selectedKey ? getSelectionKey(p) === selectedKey : p.id === selectedPlotId))
                    const plot = data.plots[0]
                    const lastDigits = plot.cadastral_number?.split(':').pop() || ''

                    const baseColor = getPlotBaseColor(plot)

                    // Show cadastral number if it's an individual plot marker
                    const showCadastral = showMarkerLabels && data.count === 1 && isDetailView

                    const marker = L.marker(data.center, {
                        icon: L.divIcon({
                            className: 'plot-marker',
                            html: `
                                <div class="relative flex items-center justify-center">
                                    ${data.count > 1 ? `
                                        <div class="relative flex items-center justify-center group">
                                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-sm">
                                                <path d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z" fill="#10b981" stroke="white" stroke-width="1.5"/>
                                            </svg>
                                            <span class="absolute top-[6px] text-[10px] font-black text-white pointer-events-none">${data.count}</span>
                                        </div>
                                    ` : `
                                        <div class="flex flex-col items-center">
                                            <div class="bg-white/95 backdrop-blur-[2px] border border-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap mb-1">
                                                ${showCadastral ? lastDigits : ""}
                                            </div>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-sm">
                                                <path d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z" fill="${isSelected ? selectedPolygonColor : (mapSettings?.marker_color ?? baseColor)}" stroke="white" stroke-width="1.5"/>
                                            </svg>
                                        </div>
                                    `}
                                </div>
                            `,
                            iconSize: [data.count > 40 ? 40 : 34, 40],
                            iconAnchor: [data.count > 1 ? 17 : 20, data.count > 1 ? 34 : 30]
                        }),
                        interactive: true,
                        zIndexOffset: isSelected ? 1000 : 0
                    })

                    marker.on('click', (e: any) => {
                        L.DomEvent.stopPropagation(e)
                        if (data.count === 1) {
                            if (onSelectPlot) onSelectPlot(data.plots[0].id)
                        } else {
                            const b = L.latLngBounds([])
                            data.plots.forEach(p => {
                                try {
                                    const lk = getLayerKey(p)
                                    const layer = polygonLayers.current[lk]
                                    if (layer?.getBounds) b.extend(layer.getBounds())
                                } catch (e) { }
                            })
                            mapInstance.current.fitBounds(b, { padding: [100, 100], maxZoom: 18 })
                        }
                    });

                    addMarkerLayer(marker)
                })
            }
        } catch (e) {
            console.error("[DGisMap] Fatal error in rendering loop:", e)
        }

        // Auto-fit logic - ONLY when props changed, NOT on zoom change
        if (needsFitRef.current) {
            if (selectedPlotId) {
                // Individual selection zoom is handled in the next useEffect
                needsFitRef.current = false
            } else if (selectedSettlement && !isSettlementClusterView) {
                const settlementBounds = L.latLngBounds([])
                let hasSettlementPlots = false
                plots.forEach(p => {
                    try {
                        if (p.location !== selectedSettlement) return
                        const lk = getLayerKey(p)
                        const layer = polygonLayers.current[lk]
                        if (layer?.getBounds) {
                            settlementBounds.extend(layer.getBounds())
                            hasSettlementPlots = true
                        }
                    } catch (e) { }
                })
                if (hasSettlementPlots) {
                    mapInstance.current.fitBounds(settlementBounds, { padding: [50, 50], maxZoom: 16 })
                    needsFitRef.current = false
                }
            } else if (hasGeometries) {
                mapInstance.current.fitBounds(allBounds, { padding: [50, 50] })
                needsFitRef.current = false
            }
        }
    }, [plots, isLeafletLoaded, selectedSettlement, selectedPlotId, zoom])

    // Handle Individual Selection Zoom
    useEffect(() => {
        if (!selectedPlotId || !mapInstance.current || !isLeafletLoaded) return

        const plot = plots.find(p => p.id === selectedPlotId)
        if (!plot || !plot.coordinates_json) return

        const L = window.L
        const selectedKey = getSelectedKey()

        // Update styling for all relative layers if they exist
        Object.entries(polygonLayers.current).forEach(([layerKey, layer]) => {
            const parsed = parseLayerKey(layerKey)
            if (!parsed) return
            const p = plots.find(item => item.id === parsed.plotId)
            if (!p) return

            const isSelected = selectedKey !== null && parsed.selectionKey === selectedKey
            const isSettlementMatch = selectedSettlement && p.location === selectedSettlement

            const outlineColor = getPlotOutlineColor(p)
            const statusColor = getPlotStatusColor(p)
            const baseFillColor = p.bundle_id ? statusColor : statusColor
            const baseFillOpacity = mapSettings?.polygon_fill_opacity ?? 0.25
            const baseWeight = mapSettings?.polygon_weight ?? 1.5

            const selFillColor = mapSettings?.selected_polygon_fill_color ?? "#ef4444"
            const selFillOpacity = mapSettings?.selected_polygon_fill_opacity ?? 0.5
            const selWeight = mapSettings?.selected_polygon_weight ?? 4
            const selColor = mapSettings?.selected_polygon_color ?? "#ef4444"

            layer.setStyle({
                color: isSelected ? selColor : outlineColor,
                fillColor: p.bundle_id ? baseFillColor : (isSelected ? selFillColor : baseFillColor),
                fillOpacity: isSelected || isSettlementMatch ? selFillOpacity : baseFillOpacity,
                weight: isSelected ? selWeight : (isSettlementMatch ? Math.max(baseWeight + 1.5, 2.5) : baseWeight),
            })
            if (isSelected) {
                try { layer.bringToFront() } catch (e) { }
            }
        })

        // Zoom to the selected plot/bundle
        if (selectedKey) {
            const bounds = L.latLngBounds([])
            let has = false

            Object.entries(polygonLayers.current).forEach(([layerKey, layer]) => {
                const parsed = parseLayerKey(layerKey)
                if (!parsed) return
                if (parsed.selectionKey !== selectedKey) return
                if (layer?.getBounds) {
                    bounds.extend(layer.getBounds())
                    has = true
                }
            })

            if (has) {
                mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 })
                return
            }
        }

        // If polygon layer doesn't exist (e.g. in settlement cluster mode), fit bounds manually.
        try {
            const convertCoordsFallback = (coords: any): any => {
                if (!coords || !Array.isArray(coords)) return coords
                if (Array.isArray(coords[0])) return coords.map(convertCoordsFallback)

                const x = coords[0]
                const y = coords[1]
                const lon = (x * 180) / 20037508.34
                let lat = (y * 180) / 20037508.34
                lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2)
                return [lat, lon]
            }

            const targets: LandPlot[] = []

            if (plot.bundle_id) {
                plots.forEach((p) => {
                    if (p.bundle_id === plot.bundle_id) targets.push(p)
                })
            } else {
                targets.push(plot)
            }

            const manualBounds = L.latLngBounds([])
            let hasManual = false

            targets.forEach((p) => {
                if (!p.coordinates_json) return
                try {
                    const leafCoords = convertCoordsFallback(p.coordinates_json.coordinates)
                    manualBounds.extend(leafCoords)
                    hasManual = true
                } catch (e) {
                    // ignore
                }
            })

            if (hasManual) {
                mapInstance.current.fitBounds(manualBounds, { padding: [50, 50], maxZoom: 18 })
            }
        } catch (e) {
            console.error("[DGisMap] Error fitting bounds manually:", e)
        }
    }, [selectedPlotId, isLeafletLoaded, plots, selectedSettlement])

    return (
        <div className="w-full h-full relative">
            <div ref={mapRef} className="w-full h-full" />

            {loading && (
                <div className="absolute inset-0 z-[1000] bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                        <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                        <span className="text-sm font-medium text-slate-700">Загрузка данных ЕГРН...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute top-4 right-4 z-[1000] max-w-[250px]">
                    <div className="bg-white p-3 rounded-xl shadow-lg border-l-4 border-l-red-500 border border-slate-100 flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-600 leading-tight">{error}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
