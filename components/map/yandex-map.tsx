"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import type { LandPlot, MapSettings } from "@/lib/types"
import { buildPlotSeoPath, buildPlotSlug } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface YandexMapProps {
  plots: LandPlot[]
  selectedPlotId: string | null
  onSelectPlot?: (id: string | null) => void
  mapSettings?: MapSettings | null
}

declare global {
  interface Window {
    ymaps: any
  }
}

export function YandexMap({ plots, selectedPlotId, onSelectPlot, mapSettings }: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polygonObjectsRef = useRef<any[]>([])
  const clustererRef = useRef<any>(null)
  const overviewPlacemarkRef = useRef<any>(null)
  const settlementPlacemarksRef = useRef<any[]>([])
  const lastCenteredPlotIdRef = useRef<string | null>(null)
  const pendingOpenBalloonPlotIdRef = useRef<string | null>(null)
  const lastPlacemarksRef = useRef<any[]>([])

  const [viewingOpen, setViewingOpen] = useState(false)
  const [viewingPlot, setViewingPlot] = useState<LandPlot | null>(null)
  const [viewingName, setViewingName] = useState("")
  const [viewingPhone, setViewingPhone] = useState("")
  const [viewingMessenger, setViewingMessenger] = useState<"max" | "telegram" | "whatsapp" | "">("")
  const [viewingConsent, setViewingConsent] = useState(false)
  const [viewingState, setViewingState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [viewingError, setViewingError] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState<number>(() => mapSettings?.initial_zoom ?? 10)
  const [mapCreatedTick, setMapCreatedTick] = useState(0)

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

  const plotHref = (p: LandPlot) => {
    return buildPlotSeoPath({
      district: p.district,
      location: p.location,
      intId: p.int_id || p.id,
    })
  }

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

  const initial = useMemo(() => {
    return {
      lat: mapSettings?.initial_center_lat ?? 54.7104,
      lon: mapSettings?.initial_center_lon ?? 20.5101,
      zoom: mapSettings?.initial_zoom ?? 10,
    }
  }, [mapSettings?.initial_center_lat, mapSettings?.initial_center_lon, mapSettings?.initial_zoom])

  const desiredControls = useMemo(() => {
    const zoom = mapSettings?.yandex_show_zoom_control ?? true
    const fullscreen = mapSettings?.yandex_show_fullscreen_control ?? true
    const typeSelector = mapSettings?.yandex_show_type_selector ?? true
    const traffic = mapSettings?.yandex_show_traffic ?? true
    const geo = mapSettings?.yandex_show_geolocation ?? true

    const controls: string[] = []
    if (zoom) controls.push("zoomControl")
    if (fullscreen) controls.push("fullscreenControl")
    if (typeSelector) controls.push("typeSelector")
    if (traffic) controls.push("trafficControl")
    if (geo) controls.push("geolocationControl")
    return controls
  }, [
    mapSettings?.yandex_show_zoom_control,
    mapSettings?.yandex_show_fullscreen_control,
    mapSettings?.yandex_show_type_selector,
    mapSettings?.yandex_show_traffic,
    mapSettings?.yandex_show_geolocation,
  ])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!apiKey) {
      setError("Не задан NEXT_PUBLIC_YANDEX_MAPS_API_KEY")
      setReady(false)
      return
    }

    if (window.ymaps) {
      setReady(true)
      return
    }

    setLoading(true)
    setError(null)

    const existing = document.querySelector('script[data-yandex-maps="true"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => setReady(true))
      existing.addEventListener("error", () => setError("Не удалось загрузить Яндекс.Карты"))
      setLoading(false)
      return
    }

    const script = document.createElement("script")
    script.dataset.yandexMaps = "true"
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
    script.async = true
    script.onload = () => {
      setReady(true)
      setLoading(false)
    }
    script.onerror = () => {
      setError("Не удалось загрузить Яндекс.Карты")
      setLoading(false)
    }

    document.head.appendChild(script)

    return () => {
      // do not remove script to avoid re-loading when user toggles
    }
  }, [apiKey])

  useEffect(() => {
    if (!ready) return
    if (!mapRef.current) return
    if (mapInstanceRef.current) return

    if (!window.ymaps) {
      setError("Yandex Maps API не доступен")
      return
    }

    setError(null)

    window.ymaps.ready(() => {
      if (!mapRef.current) return
      mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
        center: [initial.lat, initial.lon],
        zoom: initial.zoom,
        controls: desiredControls,
      })

      setMapCreatedTick((v) => v + 1)

      mapInstanceRef.current.events.add("click", () => {
        onSelectPlot?.(null)
      })

      mapInstanceRef.current.events.add("boundschange", (e: any) => {
        const z = e?.get?.("newZoom")
        if (typeof z === "number") setZoom(z)
      })

      try {
        const current = mapInstanceRef.current.getZoom?.()
        if (typeof current === "number") setZoom(current)
      } catch {
        // ignore
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy()
        } catch {
          // ignore
        }
        mapInstanceRef.current = null
      }
    }
  }, [ready, initial.lat, initial.lon, initial.zoom])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    if (!map.controls?.remove || !map.controls?.add) return

    const all = ["zoomControl", "fullscreenControl", "typeSelector", "trafficControl", "geolocationControl"]
    for (const name of all) {
      try {
        map.controls.remove(name)
      } catch {
        // ignore
      }
    }

    for (const name of desiredControls) {
      try {
        map.controls.add(name)
      } catch {
        // ignore
      }
    }
  }, [desiredControls])

  const getPlotStatusColor = (plot: LandPlot) => {
    const ownershipColor = mapSettings?.ownership_polygon_color ?? mapSettings?.polygon_color ?? "#10b981"
    const leaseColor = mapSettings?.lease_polygon_color ?? "#f97316"
    const reservedColor = mapSettings?.reserved_polygon_color ?? "#64748b"

    if ((plot as any).is_reserved) return reservedColor
    if (String((plot as any).ownership_type || "ownership") === "lease") return leaseColor
    return ownershipColor
  }

  const getPlotOutlineColor = (plot: LandPlot) => {
    const bundleColor = mapSettings?.bundle_polygon_color ?? "#3b82f6"
    return (plot as any).bundle_id ? bundleColor : getPlotStatusColor(plot)
  }

  const getPlotBaseColor = (plot: LandPlot) => {
    const bundleColor = mapSettings?.bundle_polygon_color ?? "#3b82f6"
    if ((plot as any).bundle_id) return bundleColor
    return getPlotStatusColor(plot)
  }

  const getSelectionKey = (plot: LandPlot) => {
    return (plot as any).bundle_id ? `bundle:${(plot as any).bundle_id}` : `plot:${plot.id}`
  }

  const getSelectedKey = () => {
    if (!selectedPlotId) return null
    const selectedPlot = plots.find((p) => p.id === selectedPlotId)
    if (!selectedPlot) return null
    return getSelectionKey(selectedPlot)
  }

  const convertCoords3857To4326 = (coords: any): any => {
    if (!coords || !Array.isArray(coords)) throw new Error("Coordinates are missing or not an array")

    if (Array.isArray(coords[0])) {
      return coords.map(convertCoords3857To4326)
    }

    const x = coords[0]
    const y = coords[1]
    if (typeof x !== "number" || typeof y !== "number" || Number.isNaN(x) || Number.isNaN(y)) {
      throw new Error(`Invalid coordinate components: x=${x}, y=${y}`)
    }

    // Heuristic:
    // - GeoJSON in EPSG:4326 is usually [lon, lat]
    // - Some sources may provide [lat, lon]
    // - WebMercator EPSG:3857 values are large (|x|,|y| ~ millions)
    if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
      // [lon, lat]
      return [y, x]
    }
    if (Math.abs(x) <= 90 && Math.abs(y) <= 180) {
      // [lat, lon]
      return [x, y]
    }

    // EPSG:3857 -> EPSG:4326
    const lon = (x * 180) / 20037508.34
    let lat = (y * 180) / 20037508.34
    lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2)

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      throw new Error(`Coordinate conversion resulted in NaN: lat=${lat}, lon=${lon}`)
    }

    return [lat, lon]
  }

  const getPlotCenter = (plot: LandPlot): [number, number] | null => {
    if (typeof plot.center_lat === "number" && typeof plot.center_lon === "number") {
      if (!Number.isNaN(plot.center_lat) && !Number.isNaN(plot.center_lon)) return [plot.center_lat, plot.center_lon]
    }

    let geom: any = (plot as any).coordinates_json
    if (typeof geom === "string") {
      try {
        geom = JSON.parse(geom)
      } catch {
        geom = null
      }
    }
    if (geom?.coordinates) {
      try {
        const converted = convertCoords3857To4326(geom.coordinates)
        const walk = (c: any): [number, number] | null => {
          if (!c || !Array.isArray(c) || c.length === 0) return null
          if (typeof c[0] === "number" && typeof c[1] === "number") return [c[0], c[1]]
          return walk(c[0])
        }
        return walk(converted)
      } catch {
        return null
      }
    }

    return null
  }

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !window.ymaps) return

    let cancelled = false

    const clearGeoObjects = (arr: any[]) => {
      arr.forEach((o) => {
        try {
          map.geoObjects.remove(o)
        } catch {
          // ignore
        }
      })
      arr.length = 0
    }

    // clear previous
    if (clustererRef.current) {
      try {
        clustererRef.current.removeAll()
      } catch {
        // ignore
      }
    }
    if (overviewPlacemarkRef.current) {
      try {
        map.geoObjects.remove(overviewPlacemarkRef.current)
      } catch {
        // ignore
      }
      overviewPlacemarkRef.current = null
    }
    if (settlementPlacemarksRef.current.length) {
      settlementPlacemarksRef.current.forEach((pm) => {
        try {
          map.geoObjects.remove(pm)
        } catch {
          // ignore
        }
      })
      settlementPlacemarksRef.current.length = 0
    }
    markersRef.current.length = 0
    clearGeoObjects(polygonObjectsRef.current)

    // Ensure a single Clusterer instance is attached to the map
    if (!clustererRef.current) {
      // Custom cluster icon layout - pin/droplet style
      const clusterIconLayout = window.ymaps.templateLayoutFactory.createClass(
        `<div style="position:relative; width:48px; height:56px;">
           <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 12px rgba(0,0,0,.25));">
             <path d="M24 54C24 54 44 36 44 22C44 10.954 35.046 2 24 2S4 10.954 4 22C4 36 24 54 24 54z" fill="rgba(82,196,26,.95)" stroke="white" stroke-width="3"/>
           </svg>
           <div style="position:absolute; top:8px; left:0; right:0; display:flex; align-items:center; justify-content:center; font-weight:900; color:#fff; font-size:14px; text-shadow: 0 1px 2px rgba(0,0,0,.2);">$[properties.geoObjects.length]</div>
         </div>`,
      )

      clustererRef.current = new window.ymaps.Clusterer({
        // No preset - using fully custom layout
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterOpenBalloonOnClick: true,
        clusterHideIconOnBalloonOpen: false,
        geoObjectHideIconOnBalloonOpen: false,
        // Use custom layout for cluster icons
        clusterIconLayout: clusterIconLayout,
        clusterIconShape: { type: "Rectangle", coordinates: [[0, 0], [48, 56]] },
        // Settings
        hasBalloon: true,
        hasHint: true,
        maxZoom: 15,
        minClusterSize: 2,
        // Larger grid to prevent overlapping
        gridSize: 80,
      })
      try {
        map.geoObjects.add(clustererRef.current)
      } catch {
        // ignore
      }
    }

    const currentZoom = typeof zoom === "number" ? zoom : (map.getZoom?.() ?? initial.zoom)
    const clusterZoomThreshold = mapSettings?.cluster_zoom_threshold ?? 15
    const detailZoomThreshold = mapSettings?.detail_zoom_threshold ?? 16
    const isClusterView = currentZoom < clusterZoomThreshold
    const isDetailView = currentZoom >= detailZoomThreshold

    // Two-level aggregation:
    // - Global overview (very low zoom): one marker with total count
    // - Settlement overview (low zoom): one marker per settlement (location) with count
    const globalOverviewZoomThreshold = 8
    const settlementOverviewZoomThreshold = Math.min(12, clusterZoomThreshold)

    const polygonFillOpacity = mapSettings?.polygon_fill_opacity ?? 0.25
    const polygonWeight = mapSettings?.polygon_weight ?? 1.5
    const selectedPolygonColor = mapSettings?.selected_polygon_color ?? "#ef4444"
    const selectedPolygonFillColor = mapSettings?.selected_polygon_fill_color ?? selectedPolygonColor
    const selectedPolygonFillOpacity = mapSettings?.selected_polygon_fill_opacity ?? 0.5
    const selectedPolygonWeight = mapSettings?.selected_polygon_weight ?? 4

    const showTooltip = mapSettings?.show_tooltip ?? true
    const tooltipShowTitle = mapSettings?.tooltip_show_title ?? true
    const tooltipShowCadastral = mapSettings?.tooltip_show_cadastral ?? true
    const tooltipShowPrice = mapSettings?.tooltip_show_price ?? true
    const tooltipShowArea = mapSettings?.tooltip_show_area ?? true
    const tooltipShowLandStatus = mapSettings?.tooltip_show_land_status ?? true
    const tooltipShowLocation = mapSettings?.tooltip_show_location ?? false
    const showMarkerLabels = mapSettings?.show_marker_labels ?? true

    const selectedKey = getSelectedKey()
    const bundlePlotsById = new Map<string, LandPlot[]>()
    plots.forEach((p) => {
      const bid = (p as any).bundle_id
      if (!bid) return
      const arr = bundlePlotsById.get(bid) || []
      arr.push(p)
      bundlePlotsById.set(bid, arr)
    })

    const getBundleMembers = (plot: LandPlot): LandPlot[] => {
      const bid = (plot as any).bundle_id
      if (!bid) return []
      return bundlePlotsById.get(bid) || []
    }

    const buildHintText = (plot: LandPlot) => {
      const members = getBundleMembers(plot)
      const isBundle = members.length > 1

      const area = isBundle
        ? members.reduce((sum, p) => sum + (Number((p as any).area_sotok) || 0), 0)
        : (Number((plot as any).area_sotok) || 0)

      const price = isBundle
        ? members.reduce((sum, p) => sum + (Number((p as any).price) || 0), 0)
        : (Number((plot as any).price) || 0)

      const cadastralList = (isBundle ? members : [plot])
        .map((p) => String(p.cadastral_number || "").trim())
        .filter(Boolean)

      const lines: string[] = []
      if (isBundle) {
        lines.push("Продаются вместе")
        if (cadastralList.length) lines.push(cadastralList.slice(0, 2).join(" + "))
      } else {
        if (cadastralList[0]) lines.push(cadastralList[0])
      }

      const meta: string[] = []
      if (price) meta.push(`${price.toLocaleString()} ₽`)
      if (area) meta.push(`${area} сот.`)
      if (meta.length) lines.push(meta.join(" • "))

      return lines.join("\n")
    }

    const buildTooltipHtml = (plot: LandPlot) => {
      const parts: string[] = []
      const markerColor = mapSettings?.marker_color ?? (mapSettings?.polygon_color ?? "#10b981")

      const members = getBundleMembers(plot)
      const isBundle = members.length > 1
      const bundleArea = isBundle
        ? members.reduce((sum, p) => sum + (Number((p as any).area_sotok) || 0), 0)
        : 0
      const bundlePrice = isBundle
        ? members.reduce((sum, p) => sum + (Number((p as any).price) || 0), 0)
        : 0

      const cadastralList = (isBundle ? members : [plot])
        .map((p) => String(p.cadastral_number || "").trim())
        .filter(Boolean)

      if (isBundle) {
        parts.push(`<div style="font-weight:800;font-size:13px;color:#1f2937">Продаются вместе</div>`)
      } else if (tooltipShowTitle) {
        parts.push(`<div style="font-weight:700;font-size:13px;color:#1f2937">${plot.title || "Участок"}</div>`)
      }

      const row: string[] = []
      if (tooltipShowCadastral) {
        if (isBundle && cadastralList.length) {
          row.push(
            `<span style="font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:11px; color:#6b7280">${cadastralList
              .slice(0, 2)
              .join("<br/>")}</span>`,
          )
        } else {
          row.push(`<span style="font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:11px; color:#6b7280">${plot.cadastral_number || ""}</span>`)
        }
      }
      if (tooltipShowPrice) {
        const price = isBundle ? bundlePrice : (Number((plot as any).price) || 0)
        row.push(`<span style="font-weight:700; font-size:12px; color:${markerColor}">${price.toLocaleString()} ₽</span>`)
      }
      if (row.length) parts.push(`<div style="display:flex; gap:10px; justify-content:space-between">${row.join("")}</div>`)

      const meta: string[] = []
      if (tooltipShowArea) {
        const area = isBundle ? bundleArea : (Number((plot as any).area_sotok) || 0)
        if (area) meta.push(`${area} сот.`)
      }
      if (tooltipShowLandStatus && (plot as any).land_status) meta.push(String((plot as any).land_status))
      if (tooltipShowLocation && (plot as any).location) meta.push(String((plot as any).location))
      if (meta.length) parts.push(`<div style="font-size:11px; color:#9ca3af">${meta.join(" • ")}</div>`)

      const safeId = String(plot.id).replace(/"/g, "")
      const safeHref = String(plotHref(plot)).replace(/"/g, "")
      parts.push(
        `<div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap">
           <button type="button" data-plot-id="${safeId}" onclick="window.dispatchEvent(new CustomEvent('rkkland:viewing',{detail:{plotId:'${safeId}'}}))" style="display:inline-block; padding:10px 12px; border-radius:12px; background:${markerColor}; color:#fff; font-weight:800; font-size:12px; text-decoration:none; border:none; cursor:pointer">Записаться на просмотр</button>
           <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:10px 12px; border-radius:12px; background:rgba(15,23,42,.06); color:#0f172a; font-weight:800; font-size:12px; text-decoration:none; border:1px solid rgba(15,23,42,.12)">Открыть участок</a>
         </div>`,
      )

      return `<div style="padding:8px; min-width:180px">${parts.join("")}</div>`
    }

    const addPlacemark = (plot: LandPlot, point: [number, number]) => {
      const key = getSelectionKey(plot)
      const isSelected = selectedKey !== null && key === selectedKey
      const baseColor = getPlotBaseColor(plot)

      const labelZoomThreshold = Math.max(1, (mapSettings?.detail_zoom_threshold ?? 16) - 1)

      const showLabel = showMarkerLabels && currentZoom >= labelZoomThreshold

      const pinColor = isSelected ? selectedPolygonColor : baseColor

      const html = showLabel
        ? `<div style="width:22px; height:22px; display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 4px 10px rgba(0,0,0,.18)); transition: transform 0.25s ease-out, opacity 0.25s ease-out;">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M12 22s7-6.2 7-12.2C19 5.6 15.9 3 12 3S5 5.6 5 9.8C5 15.8 12 22 12 22z" fill="${pinColor}" stroke="white" stroke-width="1.6"/>
               <circle cx="12" cy="10" r="3" fill="rgba(255,255,255,.55)"/>
             </svg>
           </div>`
        : `<div style="width:16px; height:16px; border-radius:9999px; background:${pinColor}; border:2px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,.15); transition: transform 0.25s ease-out, opacity 0.25s ease-out;"></div>`

      const placemark = new window.ymaps.Placemark(
        point,
        {
          hintContent: buildHintText(plot),
          balloonContent: showTooltip ? buildTooltipHtml(plot) : undefined,
          plotId: plot.id,
        },
        {
          iconLayout: "default#imageWithContent",
          iconImageHref: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
          iconImageSize: [1, 1],
          iconImageOffset: [0, 0],
          iconContentLayout: window.ymaps.templateLayoutFactory.createClass(html),
          iconContentOffset: showLabel ? [-11, -22] : [-13, -13],
        },
      )

      placemark.events.add("click", (e: any) => {
        e?.stopPropagation?.()
        pendingOpenBalloonPlotIdRef.current = plot.id
        onSelectPlot?.(plot.id)
      })

      return placemark
    }

    const addPolygonObject = (plot: LandPlot) => {
      let geom: any = (plot as any).coordinates_json
      if (typeof geom === "string") {
        try {
          geom = JSON.parse(geom)
        } catch {
          geom = null
        }
      }
      if (!geom?.type || !geom?.coordinates) return [] as any[]

      const key = getSelectionKey(plot)
      const isSelected = selectedKey !== null && key === selectedKey

      const outlineColor = getPlotOutlineColor(plot)
      const statusColor = getPlotStatusColor(plot)

      const style = {
        strokeColor: isSelected ? selectedPolygonColor : outlineColor,
        strokeWidth: isSelected ? selectedPolygonWeight : polygonWeight,
        fillColor: isSelected ? selectedPolygonFillColor : statusColor,
        fillOpacity: isSelected ? selectedPolygonFillOpacity : polygonFillOpacity,
      }

      const objects: any[] = []

      const onObjClick = (e: any) => {
        e?.stopPropagation?.()
        onSelectPlot?.(plot.id)
      }

      const balloonContent = showTooltip ? buildTooltipHtml(plot) : undefined
      const hintContent = buildHintText(plot)

      try {
        if (geom.type === "Polygon") {
          const rings = convertCoords3857To4326(geom.coordinates) as Array<Array<[number, number]>>
          const polygon = new window.ymaps.Polygon(rings, { balloonContent, hintContent, plotId: plot.id }, style)
          polygon.events.add("click", onObjClick)
          objects.push(polygon)
        } else if (geom.type === "MultiPolygon") {
          const polys = convertCoords3857To4326(geom.coordinates) as Array<Array<Array<[number, number]>>>
          for (const rings of polys) {
            const polygon = new window.ymaps.Polygon(rings, { balloonContent, hintContent, plotId: plot.id }, style)
            polygon.events.add("click", onObjClick)
            objects.push(polygon)
          }
        }
      } catch {
        return []
      }

      return objects
    }

    const selectedId = selectedPlotId

    // Prepare objects
    const placemarks: any[] = []
    const polygons: any[] = []

    plots.forEach((p) => {
      const center = getPlotCenter(p)
      if (center) {
        placemarks.push(addPlacemark(p, center))
      }

      // In cluster view draw polygons only for selected plot to avoid clutter,
      // otherwise draw polygons for all plots
      const shouldDrawPolygon = !isClusterView || (selectedId && p.id === selectedId)
      if (shouldDrawPolygon) {
        const polyObjs = addPolygonObject(p)
        polyObjs.forEach((o) => polygons.push(o))
      }
    })

    lastPlacemarksRef.current = placemarks

    // Overview mode: at very low zoom show a single aggregated marker with total count.
    if (!selectedPlotId && currentZoom <= globalOverviewZoomThreshold) {
      const points: [number, number][] = []
      plots.forEach((p) => {
        const c = getPlotCenter(p)
        if (c) points.push(c)
      })

      const center = (() => {
        if (points.length === 0) return [initial.lat, initial.lon] as [number, number]
        let lat = 0
        let lon = 0
        for (const p of points) {
          lat += p[0]
          lon += p[1]
        }
        return [lat / points.length, lon / points.length] as [number, number]
      })()

      const total = placemarks.length
      const html = `<div style="display:flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:9999px; background:rgba(82,196,26,.95); border:4px solid #fff; box-shadow:0 14px 32px rgba(0,0,0,.22); font-weight:950; color:#fff; font-size:16px;">${total}</div>`
      try {
        const pm = new window.ymaps.Placemark(
          center,
          {
            hintContent: `${total} участков`,
          },
          {
            iconLayout: "default#imageWithContent",
            iconImageHref: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
            iconImageSize: [1, 1],
            iconImageOffset: [0, 0],
            iconContentLayout: window.ymaps.templateLayoutFactory.createClass(html),
            iconContentOffset: [-26, -26],
            zIndex: 200000,
          },
        )
        overviewPlacemarkRef.current = pm
        map.geoObjects.add(pm)
      } catch {
        // ignore
      }
      return () => {
        cancelled = true
      }
    }

    // Settlement overview: at low zoom show one marker per settlement (location) with lot count.
    if (!selectedPlotId && currentZoom <= settlementOverviewZoomThreshold) {
      const byLoc = new Map<string, { plots: LandPlot[]; points: [number, number][]; lotKeys: Set<string> }>()

      plots.forEach((p) => {
        const loc = String((p as any).location || "").trim()
        if (!loc) return
        const center = getPlotCenter(p)
        if (!center) return

        const entry = byLoc.get(loc) || { plots: [] as LandPlot[], points: [] as [number, number][], lotKeys: new Set<string>() }
        entry.plots.push(p)
        entry.points.push(center)
        const bid = (p as any).bundle_id
        entry.lotKeys.add(bid ? `bundle:${bid}` : `plot:${p.id}`)
        byLoc.set(loc, entry)
      })

      const markerColor = mapSettings?.marker_color ?? (mapSettings?.polygon_color ?? "#10b981")
      byLoc.forEach((entry, loc) => {
        if (entry.points.length === 0) return
        let lat = 0
        let lon = 0
        for (const p of entry.points) {
          lat += p[0]
          lon += p[1]
        }
        const center: [number, number] = [lat / entry.points.length, lon / entry.points.length]
        const count = entry.lotKeys.size

        const html = `<div style="display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:9999px; background:${markerColor}; border:3px solid #fff; box-shadow:0 10px 24px rgba(0,0,0,.18); font-weight:900; color:#fff; font-size:14px;">${count}</div>`

        try {
          const pm = new window.ymaps.Placemark(
            center,
            { hintContent: `${loc}: ${count}` },
            {
              iconLayout: "default#imageWithContent",
              iconImageHref: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
              iconImageSize: [1, 1],
              iconImageOffset: [0, 0],
              iconContentLayout: window.ymaps.templateLayoutFactory.createClass(html),
              iconContentOffset: [-22, -22],
              zIndex: 150000,
            },
          )

          pm.events.add("click", (ev: any) => {
            ev?.stopPropagation?.()
            try {
              const lats = entry.points.map((p) => p[0])
              const lons = entry.points.map((p) => p[1])
              const bounds: [[number, number], [number, number]] = [
                [Math.min(...lats), Math.min(...lons)],
                [Math.max(...lats), Math.max(...lons)],
              ]
              map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50, duration: 250 })
            } catch {
              // ignore
            }
          })

          settlementPlacemarksRef.current.push(pm)
          map.geoObjects.add(pm)
        } catch {
          // ignore
        }
      })

      return () => {
        cancelled = true
      }
    }

    // Add polygons
    if (polygons.length) {
      polygons.forEach((o) => {
        try {
          map.geoObjects.add(o)
          polygonObjectsRef.current.push(o)
        } catch {
          // ignore
        }
      })
    }

    // Add markers (with clustering)
    // Always use Clusterer (it will show single markers when appropriate).
    // Add in chunks to avoid freezing UI on large datasets.
    const clusterer = clustererRef.current
    if (clusterer?.add) {
      const CHUNK_SIZE = 400
      const addChunk = (start: number) => {
        if (cancelled) return
        const chunk = placemarks.slice(start, start + CHUNK_SIZE)
        if (chunk.length === 0) return
        try {
          clusterer.add(chunk)
        } catch {
          // ignore
        }
        markersRef.current.push(...chunk)
        if (start + CHUNK_SIZE < placemarks.length) {
          setTimeout(() => addChunk(start + CHUNK_SIZE), 0)
        }
      }
      addChunk(0)
    }

    // Center on selected
    if (!selectedPlotId) {
      lastCenteredPlotIdRef.current = null
    } else if (lastCenteredPlotIdRef.current !== selectedPlotId) {
      const sel = plots.find((p) => p.id === selectedPlotId)
      const center = sel ? getPlotCenter(sel) : null
      if (center) {
        try {
          map.setCenter(center, Math.max(map.getZoom?.() || initial.zoom, 15), { duration: 250 })
        } catch {
          // ignore
        }
        lastCenteredPlotIdRef.current = selectedPlotId
      }
    }

    const pendingPlotId = pendingOpenBalloonPlotIdRef.current
    if (pendingPlotId) {
      pendingOpenBalloonPlotIdRef.current = null
      setTimeout(() => {
        try {
          const all: any[] = []
          all.push(...(lastPlacemarksRef.current || []))
          all.push(...(markersRef.current || []))
          all.push(...(polygonObjectsRef.current || []))
          const target = all.find((o) => {
            try {
              const id = o?.properties?.get?.("plotId")
              return id === pendingPlotId
            } catch {
              return false
            }
          })
          if (target?.balloon?.open) target.balloon.open()
        } catch {
          // ignore
        }
      }, 0)
    }
    return () => {
      cancelled = true
    }
  }, [plots, selectedPlotId, onSelectPlot, ready, initial.zoom, mapSettings, zoom, mapCreatedTick])

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />

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

      {loading && (
        <div className="absolute inset-0 z-[1000] bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
            <span className="text-sm font-medium text-slate-700">Загрузка Яндекс.Карт...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 right-4 z-[1000] max-w-[320px]">
          <div className="bg-white p-3 rounded-xl shadow-lg border-l-4 border-l-red-500 border border-slate-100 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-slate-600 leading-tight">{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}
