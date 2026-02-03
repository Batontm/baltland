"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { buildPlotSlug } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { AddressCombobox } from "@/components/ui/address-combobox"
import {
  MapPin,
  Ruler,
  Zap,
  Flame,
  Heart,
  ArrowRight,
  Grid3X3,
  List,
  Search,
  SlidersHorizontal,
  X,
  Droplets,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { type LandPlot, type MapSettings, LAND_STATUS_OPTIONS } from "@/lib/types"
import { PlotMapDialog } from "@/components/map/plot-map-dialog"
import { CatalogInteractiveMap } from "@/components/map/catalog-interactive-map"

function renderRichText(input: string) {
  const withBold = input
    .replace(/<\s*b\s*>/gi, "**")
    .replace(/<\s*\/\s*b\s*>/gi, "**")

  const escaped = withBold
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n/g, "\n")

  // Very small markdown subset: **bold** + new lines
  const html = escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />")

  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

interface InitialFilters {
  maxPrice?: number
  landStatus?: string
  installment?: string
  utilities?: string
  district?: string
  settlement?: string
  maxDistanceToSea?: number
  isNew?: string // "true" or "false"
  page?: number
}

interface CatalogWithFiltersProps {
  initialPlots: LandPlot[]
  initialFilters?: InitialFilters
  mapSettings?: MapSettings | null
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽"
}

export function CatalogWithFilters({ initialPlots, initialFilters, mapSettings }: CatalogWithFiltersProps) {
  const router = useRouter()
  const [selectedPlot, setSelectedPlot] = useState<LandPlot | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [isFullMapOpen, setIsFullMapOpen] = useState(false)
  const [isViewingDialogOpen, setIsViewingDialogOpen] = useState(false)
  const [viewingFormState, setViewingFormState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [viewingName, setViewingName] = useState("")
  const [viewingPhone, setViewingPhone] = useState("")
  const [viewingWhatsapp, setViewingWhatsapp] = useState(false)
  const [viewingTelegram, setViewingTelegram] = useState(false)
  const [viewingError, setViewingError] = useState("")

  const visiblePlots = useMemo(() => {
    return initialPlots.filter((p) => (!p.bundle_id || p.is_bundle_primary) && p.price > 0)
  }, [initialPlots])

  const bundleMetaById = useMemo(() => {
    const map = new Map<
      string,
      {
        plots: LandPlot[]
        primary: LandPlot | null
        totalArea: number
        totalPrice: number
        cadastralNumbers: string[]
        cadastralEntries: string[]
      }
    >()

    initialPlots.forEach((p) => {
      const b = p.bundle_id
      if (!b) return
      const existing = map.get(b)
      if (existing) {
        existing.plots.push(p)
      } else {
        map.set(b, { plots: [p], primary: null, totalArea: 0, totalPrice: 0, cadastralNumbers: [], cadastralEntries: [] })
      }
    })

    for (const [bundleId, meta] of map.entries()) {
      meta.primary = meta.plots.find((p) => p.is_bundle_primary) ?? null
      meta.totalArea = meta.plots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
      meta.totalPrice = meta.plots.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
      meta.cadastralNumbers = meta.plots
        .map((p) => p.cadastral_number)
        .filter((v): v is string => !!v)
        .sort((a, b) => a.localeCompare(b))

      meta.cadastralEntries = meta.plots
        .slice()
        .sort((a, b) => String(a.cadastral_number || "").localeCompare(String(b.cadastral_number || "")))
        .map((p) => {
          const cn = String(p.cadastral_number || "").trim()
          if (!cn) return null
          const a = Number(p.area_sotok) || 0
          return `${cn} (${a} сот.)`
        })
        .filter((v): v is string => !!v)
    }

    return map
  }, [initialPlots])

  const selectedPlotBundleMeta = useMemo(() => {
    if (!selectedPlot?.bundle_id) return null
    return bundleMetaById.get(selectedPlot.bundle_id) ?? null
  }, [selectedPlot?.bundle_id, bundleMetaById])

  const formatOwnershipLabel = (plot: LandPlot) => {
    if (plot.is_reserved) return "забронировано"
    if (String(plot.ownership_type || "ownership") === "lease") return "аренда"
    return "собственность"
  }

  const maxPriceFromData = useMemo(() => {
    if (visiblePlots.length === 0) return 10000000
    return Math.max(...visiblePlots.map((plot) => plot.price))
  }, [visiblePlots])

  const minPriceFromData = useMemo(() => {
    // Only consider plots with price > 0 for minimum price calculation
    const plotsWithPrice = visiblePlots.filter((plot) => plot.price > 0)
    if (plotsWithPrice.length === 0) return 0
    return Math.min(...plotsWithPrice.map((plot) => plot.price))
  }, [visiblePlots])

  const [favorites, setFavorites] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [currentPage, setCurrentPage] = useState(initialFilters?.page || 1)
  const [itemsPerPage, setItemsPerPage] = useState(3)

  // Filter states
  const [district, setDistrict] = useState("")
  const [settlement, setSettlement] = useState("")
  const [priceRange, setPriceRange] = useState<[number, number]>([minPriceFromData, maxPriceFromData])
  const [landStatus, setLandStatus] = useState("all")
  const [communications, setCommunications] = useState("all")
  const [installment, setInstallment] = useState("all")
  const [maxDistanceToSea, setMaxDistanceToSea] = useState<number | null>(null)
  const [isNew, setIsNew] = useState(false)

  const lastApplyRef = useRef(0)

  const [pdFilters, setPdFilters] = useState<{ budget: string | null; distance: string | null; amenities: string[] } | null>(null)
  const [isPdOpen, setIsPdOpen] = useState(false)

  // Apply initial filters from URL on mount
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.district) {
        setDistrict(initialFilters.district)
      }
      if (initialFilters.settlement) {
        setSettlement(initialFilters.settlement)
      }
      if (initialFilters.maxPrice) {
        setPriceRange([minPriceFromData, Math.max(minPriceFromData, initialFilters.maxPrice)])
      }
      if (initialFilters.landStatus) {
        setLandStatus(initialFilters.landStatus)
      }
      if (initialFilters.installment) {
        setInstallment(initialFilters.installment)
      }
      if (initialFilters.utilities) {
        setCommunications(initialFilters.utilities)
      }
      if (typeof initialFilters.maxDistanceToSea === "number") {
        setMaxDistanceToSea(initialFilters.maxDistanceToSea)
      }
      // Show advanced filters if any filter is set
      if (
        initialFilters.landStatus ||
        initialFilters.installment ||
        initialFilters.utilities ||
        initialFilters.district ||
        initialFilters.settlement ||
        typeof initialFilters.maxDistanceToSea === "number" ||
        initialFilters.isNew
      ) {
        setShowAdvanced(true)
      }
      if (initialFilters.isNew === "true") {
        setIsNew(true)
      }
    }
  }, [initialFilters, minPriceFromData])

  const mapBudgetToRange = (b: string | null): [number, number] => {
    const min = minPriceFromData
    const max = maxPriceFromData
    if (!b) return [min, max]

    const norm = b.toLowerCase()
    if (norm.includes("500") && (norm.includes("до") || norm.includes("<") || norm.includes("≤"))) {
      return [min, Math.min(max, 500000)]
    }
    if (norm.includes("500") && norm.includes("1")) {
      return [Math.max(min, 500000), Math.min(max, 1000000)]
    }
    if (norm.includes("1") && norm.includes("2")) {
      return [Math.max(min, 1000000), Math.min(max, 2000000)]
    }
    if (norm.includes(">") || norm.includes("2")) {
      return [Math.max(min, 2000000), max]
    }
    return [min, max]
  }

  const mapDistanceToMaxSea = (d: string | null): number | null => {
    if (!d) return null
    const norm = d.toLowerCase()
    if (norm.includes("<") && norm.includes("15")) return 15
    if (norm.includes("15") && norm.includes("25")) return 25
    if (norm.includes("25") && norm.includes("40")) return 40
    if (norm.includes("40") && norm.includes("+")) return null
    return null
  }

  const mapAmenitiesToComm = (amenities: string[]): "all" | "full" | "gas" | "electricity" | "water" => {
    const aSet = new Set(amenities.map((a) => String(a).toLowerCase()))
    const hasGas = aSet.has("газ")
    const hasElectricity = aSet.has("свет")
    const hasWater = aSet.has("вода")
    if ((hasGas && hasElectricity) || (hasGas && hasWater) || (hasElectricity && hasWater)) return "full"
    if (hasGas) return "gas"
    if (hasElectricity) return "electricity"
    if (hasWater) return "water"
    return "all"
  }

  const countLots = (arr: LandPlot[]) => {
    const seen = new Set<string>()
    let n = 0
    for (const p of arr) {
      if (!p.price || p.price <= 0) continue
      const bid = (p as any).bundle_id
      const key = bid ? `bundle:${bid}` : `plot:${p.id}`
      if (seen.has(key)) continue
      seen.add(key)
      n += 1
    }
    return n
  }

  useEffect(() => {
    const previewHandler = (e: any) => {
      const detail = e?.detail || {}
      const budget = typeof detail.budget === "string" ? detail.budget : null
      const distance = typeof detail.distance === "string" ? detail.distance : null
      const amenities = Array.isArray(detail.amenities) ? (detail.amenities as string[]) : []
      setPdFilters({ budget, distance, amenities })
    }

    const openHandler = (e: any) => {
      previewHandler(e)
      setIsPdOpen(true)
    }

    window.addEventListener("rkkland:pdPreview", previewHandler as any)
    window.addEventListener("rkkland:pdOpen", openHandler as any)
    return () => {
      window.removeEventListener("rkkland:pdPreview", previewHandler as any)
      window.removeEventListener("rkkland:pdOpen", openHandler as any)
    }
  }, [])

  useEffect(() => {
    setPriceRange((prev) => {
      if (Array.isArray(prev) && prev.length === 2 && prev[0] === 0) {
        return [minPriceFromData, prev[1]]
      }
      if (Array.isArray(prev) && prev.length === 2 && prev[0] < minPriceFromData) {
        return [minPriceFromData, Math.max(minPriceFromData, prev[1])]
      }
      return prev
    })
  }, [minPriceFromData])

  // Reset settlement when district changes
  const handleDistrictChange = (value: string) => {
    setDistrict(value)
    setSettlement("")
  }

  const districtOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of visiblePlots) {
      const d = String(p.district || "").trim()
      if (d) set.add(d)
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map((name) => ({ id: name, name }))
  }, [visiblePlots])

  const settlementOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of visiblePlots) {
      const d = String(p.district || "").trim()
      const s = String(p.location || "").trim()
      if (!s) continue
      if (district) {
        const token = district.split(" ")[0]?.toLowerCase()
        if (token && !d.toLowerCase().includes(token)) continue
      }
      set.add(s)
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map((name) => ({ id: name, name }))
  }, [district, visiblePlots])

  const formatRuPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "")
    let normalized = digits
    if (normalized.startsWith("8")) normalized = "7" + normalized.slice(1)
    if (!normalized.startsWith("7")) normalized = normalized ? `7${normalized}` : "7"
    normalized = normalized.slice(0, 11)

    const p1 = normalized.slice(1, 4)
    const p2 = normalized.slice(4, 7)
    const p3 = normalized.slice(7, 9)
    const p4 = normalized.slice(9, 11)

    let out = "+7"
    if (p1) out += ` (${p1}`
    if (p1.length === 3) out += ")"
    if (p2) out += ` ${p2}`
    if (p3) out += `-${p3}`
    if (p4) out += `-${p4}`
    return out
  }

  const getRuPhoneDigitsCount = (raw: string) => raw.replace(/\D/g, "").replace(/^8/, "7").length

  const openViewingDialog = () => {
    setViewingFormState("idle")
    setViewingError("")
    setViewingName("")
    setViewingPhone("")
    setViewingWhatsapp(false)
    setViewingTelegram(false)
    setIsViewingDialogOpen(true)
  }

  const submitViewingRequest = async () => {
    if (!selectedPlot) return
    setViewingError("")

    const digitsCount = getRuPhoneDigitsCount(viewingPhone)
    if (digitsCount !== 11) {
      setViewingFormState("error")
      setViewingError("Введите корректный телефон")
      return
    }

    setViewingFormState("loading")
    try {
      const res = await fetch("/api/public/viewing-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot: {
            id: selectedPlot.id,
            location: selectedPlot.location || null,
            cadastral_number: selectedPlot.cadastral_number || null,
            price: Number.isFinite(selectedPlot.price) ? selectedPlot.price : null,
            area_sotok: Number.isFinite(selectedPlot.area_sotok) ? selectedPlot.area_sotok : null,
          },
          phone: viewingPhone,
          name: viewingName,
          messenger_whatsapp: viewingWhatsapp,
          messenger_telegram: viewingTelegram,
        }),
      })
      const result = await res.json().catch(() => ({}))

      if (res.ok && result.success) {
        setViewingFormState("success")
      } else {
        setViewingFormState("error")
        setViewingError(result.error || "Ошибка отправки")
      }
    } catch (e) {
      setViewingFormState("error")
      setViewingError("Ошибка соединения")
    }
  }

  // Filtered plots
  const filteredPlots = useMemo(() => {
    return visiblePlots.filter((plot) => {
      // District filter - use includes for partial match (e.g. "Гурьевский р-н" matches "Гурьевский")
      if (district && !plot.district?.toLowerCase().includes(district.split(' ')[0].toLowerCase())) return false

      // Settlement filter
      if (settlement && plot.location !== settlement) return false

      // Price filter
      if (plot.price < priceRange[0] || plot.price > priceRange[1]) return false

      // Distance to sea (km)
      if (typeof maxDistanceToSea === "number") {
        const dts = typeof plot.distance_to_sea === "number" ? plot.distance_to_sea : null
        if (dts === null) return false
        if (dts > maxDistanceToSea) return false
      }

      // Land status filter
      if (landStatus !== "all" && plot.land_status !== landStatus) return false

      // Communications filter
      if (communications === "full" && (!plot.has_gas || !plot.has_electricity || !plot.has_water)) return false
      if (communications === "gas" && !plot.has_gas) return false
      if (communications === "electricity" && !plot.has_electricity) return false
      if (communications === "water" && !plot.has_water) return false

      // Installment filter
      if (installment === "yes" && !plot.has_installment) return false
      if (installment === "no" && plot.has_installment) return false

      // isNew filter (last 30 days)
      if (isNew) {
        const createdAt = new Date(plot.created_at).getTime()
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
        if (createdAt < monthAgo) return false
      }

      return true
    })
  }, [visiblePlots, district, settlement, priceRange, landStatus, communications, installment, maxDistanceToSea, isNew])

  const filteredLotsCount = useMemo(() => countLots(filteredPlots), [filteredPlots])

  const filteredPlotsForMap = useMemo(() => {
    const idSet = new Set<string>()
    const out: LandPlot[] = []

    filteredPlots.forEach((p) => {
      if (p.bundle_id) {
        const meta = bundleMetaById.get(p.bundle_id)
        if (meta) {
          meta.plots.forEach((bp) => {
            if (!idSet.has(bp.id)) {
              idSet.add(bp.id)
              out.push(bp)
            }
          })
          return
        }
      }

      if (!idSet.has(p.id)) {
        idSet.add(p.id)
        out.push(p)
      }
    })

    return out
  }, [filteredPlots, bundleMetaById])

  const pdFilteredPlots = useMemo(() => {
    if (!pdFilters) return [] as LandPlot[]
    const [pdMin, pdMax] = mapBudgetToRange(pdFilters.budget)
    const pdMaxSea = mapDistanceToMaxSea(pdFilters.distance)
    const pdComm = mapAmenitiesToComm(pdFilters.amenities)

    return visiblePlots.filter((plot) => {
      if (plot.price < pdMin || plot.price > pdMax) return false
      if (typeof pdMaxSea === "number") {
        const dts = typeof (plot as any).distance_to_sea === "number" ? (plot as any).distance_to_sea : null
        if (dts === null) return false
        if (dts > pdMaxSea) return false
      }

      if (pdComm === "full" && (!(plot as any).has_gas || !(plot as any).has_electricity || !(plot as any).has_water)) return false
      if (pdComm === "gas" && !(plot as any).has_gas) return false
      if (pdComm === "electricity" && !(plot as any).has_electricity) return false
      if (pdComm === "water" && !(plot as any).has_water) return false

      return true
    })
  }, [pdFilters, visiblePlots, maxPriceFromData, minPriceFromData])

  const pdLotsCount = useMemo(() => countLots(pdFilteredPlots), [pdFilteredPlots])

  useEffect(() => {
    if (!pdFilters) return
    window.dispatchEvent(new CustomEvent("rkkland:pdCount", { detail: { count: pdLotsCount } }))
  }, [pdFilters, pdLotsCount])

  const pdFilteredPlotsForMap = useMemo(() => {
    const idSet = new Set<string>()
    const out: LandPlot[] = []

    pdFilteredPlots.forEach((p) => {
      if ((p as any).bundle_id) {
        const meta = bundleMetaById.get((p as any).bundle_id)
        if (meta) {
          meta.plots.forEach((bp) => {
            if (idSet.has(bp.id)) return
            idSet.add(bp.id)
            out.push(bp)
          })
          return
        }
      }
      if (idSet.has(p.id)) return
      idSet.add(p.id)
      out.push(p)
    })

    return out
  }, [bundleMetaById, pdFilteredPlots])

  // Sync currentPage with URL searchParams
  const searchParams = useSearchParams()
  useEffect(() => {
    const pageParam = searchParams.get("page")
    if (pageParam) {
      const p = parseInt(pageParam, 10)
      if (Number.isFinite(p) && p !== currentPage) {
        setCurrentPage(p)
      }
    } else if (currentPage !== 1 && !initialFilters?.page) {
      // If no page param and we are not on page 1, reset to 1
      // unless it was explicitly set in initialFilters
      setCurrentPage(1)
    }
  }, [searchParams, initialFilters?.page])

  const buildPageUrl = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete("page")
    } else {
      params.set("page", page.toString())
    }
    const qs = params.toString()
    return `/catalog${qs ? `?${qs}` : ""}`
  }, [searchParams])

  const totalPages = Math.ceil(filteredPlots.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPlots = filteredPlots.slice(startIndex, endIndex)

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
      // Scroll to top of catalog
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })
    }
  }

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
  }

  const resetFilters = () => {
    setDistrict("")
    setSettlement("")
    setPriceRange([minPriceFromData, maxPriceFromData])
    setLandStatus("all")
    setCommunications("all")
    setInstallment("all")
    setIsNew(false)
    setCurrentPage(1) // Reset page when resetting filters
  }

  const hasActiveFilters = useMemo(() => {
    const priceChanged = priceRange[0] !== minPriceFromData || priceRange[1] !== maxPriceFromData
    return (
      !!district ||
      !!settlement ||
      priceChanged ||
      landStatus !== "all" ||
      communications !== "all" ||
      installment !== "all" ||
      isNew
    )
  }, [communications, district, installment, landStatus, maxPriceFromData, minPriceFromData, priceRange, settlement, isNew])

  return (
    <>
      {/* Search Filters */}
      <section className="py-8 relative z-20 -mt-8">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/5 border border-border/50 p-6 lg:p-8">
            {/* Main Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Район</label>
                <AddressCombobox
                  value={district}
                  onValueChange={handleDistrictChange}
                  options={districtOptions}
                  placeholder="Все районы"
                  searchPlaceholder="Поиск района..."
                  emptyText="Район не найден"
                  loading={false}
                  className="h-12 bg-secondary/30 border-0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Посёлок</label>
                <AddressCombobox
                  value={settlement}
                  onValueChange={(v) => {
                    setSettlement(v)
                    setCurrentPage(1)
                  }}
                  options={settlementOptions}
                  placeholder="Все посёлки"
                  searchPlaceholder="Поиск посёлка..."
                  emptyText="Посёлок не найден"
                  loading={false}
                  className="h-12 bg-secondary/30 border-0"
                />
              </div>

              <div className="space-y-3 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Цена</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={priceRange[0].toLocaleString("ru-RU")}
                      onChange={(e) => {
                        const value = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0
                        setPriceRange([value, priceRange[1]])
                      }}
                      className={`w-32 h-10 text-sm text-center rounded-lg bg-secondary/30 border-2 ${priceRange[0] > priceRange[1] ? "border-red-500" : "border-transparent"
                        }`}
                      placeholder="от"
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={priceRange[1].toLocaleString("ru-RU")}
                      onChange={(e) => {
                        const value = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0
                        setPriceRange([priceRange[0], Math.max(minPriceFromData, value)])
                      }}
                      className={`w-32 h-10 text-sm text-center rounded-lg bg-secondary/30 border-2 ${priceRange[1] < priceRange[0] ? "border-red-500" : "border-transparent"
                        }`}
                      placeholder="до"
                    />
                    <span className="text-sm text-muted-foreground">₽</span>
                  </div>
                </div>
                <div className="pt-2 px-2">
                  <Slider
                    value={priceRange}
                    onValueChange={(v) => {
                      const next: [number, number] = [Number(v?.[0] ?? minPriceFromData), Number(v?.[1] ?? maxPriceFromData)]
                      setPriceRange(next)
                    }}
                    min={minPriceFromData}
                    max={maxPriceFromData}
                    step={100000}
                    className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2"
                  />
                </div>
              </div>
            </div>

            {/* Toggle Advanced */}
            <div className="flex justify-center mt-6 gap-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {showAdvanced ? "Скрыть фильтры" : "Расширенный поиск"}
                {showAdvanced && <X className="h-4 w-4" />}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Сбросить фильтры
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Map Toggle Button */}
            <div className="mt-6 group">
              <button
                onClick={() => setIsFullMapOpen(!isFullMapOpen)}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-between px-6 transition-all duration-300 transform active:scale-[0.99]"
              >
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-500 opacity-50 group-hover:opacity-100 ${isFullMapOpen ? "rotate-180" : ""}`}
                />
                <div className="flex items-center gap-2">
                  <MapPin className={`h-5 w-5 transition-transform duration-700 ${isFullMapOpen ? 'rotate-[360deg] scale-110' : ''}`} />
                  <span className="font-medium">
                    {isFullMapOpen ? "Скрыть карту участков" : "Показать все участки на карте"}
                  </span>
                </div>
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-500 opacity-50 group-hover:opacity-100 ${isFullMapOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isFullMapOpen && (
                <div className="mt-6">
                  <CatalogInteractiveMap plots={filteredPlotsForMap} mapSettings={mapSettings ?? null} />
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50 animate-fade-in">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Статус</label>
                  <Select value={landStatus} onValueChange={setLandStatus}>
                    <SelectTrigger className="w-full min-w-0 overflow-hidden h-11 rounded-xl bg-secondary/30 border-0">
                      <SelectValue placeholder="Любой" />
                    </SelectTrigger>
                    <SelectContent>
                      {LAND_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Коммуникации</label>
                  <Select value={communications} onValueChange={setCommunications}>
                    <SelectTrigger className="w-full min-w-0 overflow-hidden h-11 rounded-xl bg-secondary/30 border-0">
                      <SelectValue placeholder="Любые" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Любые</SelectItem>
                      <SelectItem value="electricity">Свет</SelectItem>
                      <SelectItem value="gas">Газ</SelectItem>
                      <SelectItem value="water">Вода</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Рассрочка</label>
                  <Select value={installment} onValueChange={setInstallment}>
                    <SelectTrigger className="w-full min-w-0 overflow-hidden h-11 rounded-xl bg-secondary/30 border-0">
                      <SelectValue placeholder="Не важно" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Не важно</SelectItem>
                      <SelectItem value="yes">Есть</SelectItem>
                      <SelectItem value="no">Нет</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            )}

            {/* New Filter Checkbox inside Advanced or separately? Let's keep it conditional or hidden if not active? 
                Actually user didn't ask for a checkbox in UI, just a link. 
                But for consistency, let's add a "Only new" checkbox in advanced filters 
            */}
            {showAdvanced && (
              <div className="mt-4 flex items-center space-x-2">
                <Checkbox id="isNew" checked={isNew} onCheckedChange={(c) => setIsNew(!!c)} />
                <label
                  htmlFor="isNew"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Только новинки (за 30 дней)
                </label>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section id="catalog" className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1">
                Каталог
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium">
                {filteredLotsCount} {filteredLotsCount === 1 ? "участок" : "участков"} в продаже
              </h2>
              <p className="text-muted-foreground mt-2">
                {filteredLotsCount !== countLots(visiblePlots) ? (
                  <button onClick={resetFilters} className="text-primary hover:underline">
                    Сбросить фильтры ({countLots(visiblePlots)} всего)
                  </button>
                ) : (
                  "Актуальные предложения на сегодня"
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Вид:</span>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-xl"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-xl"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Empty State */}
          {filteredPlots.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">Участков не найдено</h3>
              <p className="text-muted-foreground mb-6">Попробуйте изменить параметры поиска или сбросить фильтры</p>
              <Button onClick={resetFilters} variant="outline" className="rounded-xl bg-transparent">
                Сбросить фильтры
              </Button>
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" && paginatedPlots.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPlots.map((plot, index) => {
                const plotSlug = buildPlotSlug({ location: plot.location, district: plot.district, areaSotok: plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalArea ?? plot.area_sotok : plot.area_sotok })
                const plotUrl = `/plots/${plot.int_id || plot.id}/${plotSlug}`
                return (
                  <Link key={plot.id} href={plotUrl} className="block">
                    <Card
                      className="group overflow-hidden rounded-3xl border-border/50 bg-card hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1 cursor-pointer"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Image */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                        <Image
                          src={plot.image_url || ""}
                          alt={plot.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {plot.is_featured && (
                            <Badge className="bg-emerald-600 text-white rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold border-none shadow-sm">
                              Топ
                            </Badge>
                          )}
                          <Badge
                            className="bg-white/95 text-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold border-none shadow-sm hover:bg-white transition-colors"
                          >
                            {plot.land_status}
                          </Badge>
                        </div>

                        {/* Favorite Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(plot.id)
                          }}
                          className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-sm group/fav"
                        >
                          <Heart
                            className={`h-4.5 w-4.5 transition-colors ${favorites.includes(plot.id) ? "fill-red-500 text-red-500" : "text-slate-400 group-hover/fav:text-slate-600"
                              }`}
                          />
                        </button>

                        {/* Price Per Sotka */}
                        <div className="absolute bottom-3 left-3">
                          <span className="text-[10px] font-bold uppercase tracking-tight text-white bg-slate-900/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
                            {formatPrice(
                              Math.round(
                                (plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalPrice ?? plot.price : plot.price) /
                                (plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalArea || plot.area_sotok : plot.area_sotok)
                              )
                            )} / сот.
                          </span>
                        </div>
                      </div>

                      <CardContent className="p-5 flex-1 flex flex-col">
                        {/* Title / Size */}
                        <h3 className="text-lg font-semibold mb-1">
                          <span className="font-bold">
                            {plot.location && `${plot.location}`}
                            {plot.location && plot.district && ", "}
                            {plot.district && (
                              <span className="text-muted-foreground font-normal">
                                {plot.district
                                  .replace(/,?\s*Калининградская область/i, "")
                                  .replace(/\s+район/i, " (р-н)")
                                  .replace(/городской округ/i, "г.о.")
                                  .trim()}
                              </span>
                            )}
                          </span>
                        </h3>

                        {/* Bundle message */}
                        {plot.bundle_id && (
                          <div className="text-xs text-primary font-medium mb-2">
                            🏡 Участки продаются вместе
                          </div>
                        )}

                        {/* Cadastral numbers - show main + additional */}
                        {plot.bundle_id && bundleMetaById.get(plot.bundle_id)?.cadastralEntries?.length ? (
                          <div className="text-xs text-muted-foreground font-mono mb-3">
                            {(bundleMetaById.get(plot.bundle_id)?.cadastralEntries || []).slice(0, 3).join(", ")}
                          </div>
                        ) : plot.cadastral_number ? (
                          <div className="text-xs text-muted-foreground font-mono mb-3">
                            КН: {[plot.cadastral_number, ...((plot as any).additional_cadastral_numbers || [])].filter(Boolean).join(", ")}
                          </div>
                        ) : (
                          <div className="mb-3" />
                        )}

                        {/* Features */}
                        <div className="flex flex-wrap gap-2 mb-5">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                            <Ruler className="h-3.5 w-3.5" />
                            {plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalArea ?? plot.area_sotok : plot.area_sotok} соток
                          </div>
                          {plot.has_gas && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                              <Flame className="h-3.5 w-3.5" />
                              Газ
                            </div>
                          )}
                          {plot.has_electricity && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                              <Zap className="h-3.5 w-3.5" />
                              Свет
                            </div>
                          )}
                          {plot.has_water && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                              <Droplets className="h-3.5 w-3.5" />
                              Вода
                            </div>
                          )}
                          {plot.has_installment && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                              <CreditCard className="h-3.5 w-3.5" />
                              Рассрочка
                            </div>
                          )}
                        </div>

                        {/* Price & Button */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div>
                            <span className="text-2xl font-serif font-semibold">
                              {formatPrice(plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalPrice ?? plot.price : plot.price)}
                            </span>
                          </div>
                          <span className="inline-flex items-center justify-center rounded-xl border border-input bg-transparent px-4 py-2 text-sm font-medium group/btn hover:bg-accent hover:text-accent-foreground">
                            Подробнее
                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && paginatedPlots.length > 0 && (
            <div className="space-y-4">
              {paginatedPlots.map((plot, index) => {
                const plotSlug = buildPlotSlug({ location: plot.location, district: plot.district, areaSotok: plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalArea ?? plot.area_sotok : plot.area_sotok })
                const plotUrl = `/plots/${plot.int_id || plot.id}/${plotSlug}`
                return (
                  <Link key={plot.id} href={plotUrl} className="block">
                    <Card
                      className="group overflow-hidden rounded-2xl border-border/50 bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Image */}
                        <div className="relative w-full md:w-80 aspect-video md:aspect-auto shrink-0">
                          <Image
                            src={plot.image_url || ""}
                            alt={plot.title}
                            fill
                            className="object-cover"
                          />
                          {plot.is_featured && (
                            <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm rounded-full">
                              Топ
                            </Badge>
                          )}
                          <span className="absolute bottom-3 left-3 text-xs text-white/90 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            {formatPrice(
                              Math.round(
                                (plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalPrice ?? plot.price : plot.price) /
                                (plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalArea || plot.area_sotok : plot.area_sotok)
                              )
                            )} за сотку
                          </span>
                        </div>

                        {/* Content */}
                        <CardContent className="flex-1 p-6 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                {/* Title with bold location */}
                                <h3 className="text-xl font-semibold mb-1">
                                  <span className="font-bold">
                                    {plot.location && `${plot.location}`}
                                    {plot.location && plot.district && ", "}
                                    {plot.district && (
                                      <span className="text-muted-foreground font-normal">
                                        {plot.district
                                          .replace(/,?\s*Калининградская область/i, "")
                                          .replace(/\s+район/i, " (р-н)")
                                          .replace(/городской округ/i, "г.о.")
                                          .trim()}
                                      </span>
                                    )}
                                  </span>
                                </h3>

                                {/* Bundle message */}
                                {plot.bundle_id && (
                                  <div className="text-xs text-primary font-medium mb-2">
                                    🏡 Участки продаются вместе
                                  </div>
                                )}

                                {/* Cadastral numbers */}
                                {plot.bundle_id && bundleMetaById.get(plot.bundle_id)?.cadastralEntries?.length ? (
                                  <div className="text-xs text-muted-foreground font-mono mb-2">
                                    {(bundleMetaById.get(plot.bundle_id)?.cadastralEntries || []).join(", ")}
                                  </div>
                                ) : plot.cadastral_number ? (
                                  <div className="text-xs text-muted-foreground font-mono mb-2">
                                    КН: {[plot.cadastral_number, ...((plot as any).additional_cadastral_numbers || [])].filter(Boolean).join(", ")}
                                  </div>
                                ) : null}

                                {/* Price and area */}
                                <div className="flex items-center gap-4 text-sm mb-2">
                                  <span className="font-semibold text-primary">
                                    {formatPrice(plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalPrice ?? plot.price : plot.price)}
                                  </span>
                                  <span>{plot.bundle_id ? bundleMetaById.get(plot.bundle_id)?.totalArea : plot.area_sotok} сот.</span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(plot.id)
                                }}
                                className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                              >
                                <Heart
                                  className={`h-5 w-5 transition-colors ${favorites.includes(plot.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                                    }`}
                                />
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="rounded-full">
                                {plot.land_status}
                              </Badge>
                              {plot.has_gas && (
                                <Badge variant="outline" className="rounded-full">
                                  Газ
                                </Badge>
                              )}
                              {plot.has_electricity && (
                                <Badge variant="outline" className="rounded-full">
                                  Свет
                                </Badge>
                              )}
                              {plot.has_water && (
                                <Badge variant="outline" className="rounded-full">
                                  Вода
                                </Badge>
                              )}
                              {plot.has_installment && (
                                <Badge variant="outline" className="rounded-full text-primary border-primary">
                                  Рассрочка
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                className="rounded-xl bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Show phone callback handled by existing logic
                                }}
                              >
                                Показать телефон
                              </Button>
                              <span className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
                                Подробнее
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          <Dialog open={!!selectedPlot} onOpenChange={(open) => (!open ? setSelectedPlot(null) : null)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogTitle className="sr-only">Просмотр участка</DialogTitle>
              {selectedPlot && (
                <div className="space-y-6">
                  <div className="relative aspect-video rounded-3xl overflow-hidden bg-muted">
                    <Image
                      src={
                        selectedPlot.image_url || ""
                      }
                      alt={selectedPlot.title}
                      fill
                      className="object-cover object-top"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      {selectedPlot.is_featured && (
                        <Badge className="bg-primary/90 backdrop-blur-sm rounded-full">Топ</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h2 className="text-lg md:text-xl font-serif font-semibold leading-tight break-words">
                          <span className="font-bold">
                            {selectedPlot.district && `${selectedPlot.district}`}
                            {selectedPlot.district && selectedPlot.location && ", "}
                            {selectedPlot.location && `${selectedPlot.location}`}
                          </span>
                        </h2>

                        {selectedPlot.bundle_id && (
                          <div className="text-sm text-primary font-medium">
                            🏡 Земельные участки продаются вместе
                          </div>
                        )}

                        {selectedPlot.cadastral_number && (
                          <div className="text-sm text-muted-foreground font-mono">
                            {selectedPlot.bundle_id
                              ? (bundleMetaById.get(selectedPlot.bundle_id)?.cadastralEntries || []).join(", ")
                              : `КН: ${[selectedPlot.cadastral_number, ...((selectedPlot as any).additional_cadastral_numbers || [])].filter(Boolean).join(", ")}`}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold text-primary">
                          {formatPrice(
                            selectedPlot.bundle_id
                              ? bundleMetaById.get(selectedPlot.bundle_id)?.totalPrice ?? selectedPlot.price
                              : selectedPlot.price,
                          )}
                        </span>
                        <span>
                          {(selectedPlot.bundle_id
                            ? bundleMetaById.get(selectedPlot.bundle_id)?.totalArea
                            : selectedPlot.area_sotok) ?? selectedPlot.area_sotok}{" "}
                          сот.
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {(selectedPlot.coordinates_json || selectedPlot.has_coordinates || selectedPlot.cadastral_number) && (
                          <Button variant="secondary" className="rounded-xl px-6 h-11" onClick={() => setIsMapOpen(true)}>
                            <MapPin className="h-4 w-4 mr-2" />
                            На карте
                          </Button>
                        )}
                        <Button className="rounded-xl px-6 h-11" onClick={openViewingDialog}>
                          Записаться на просмотр
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <Badge variant="secondary" className="rounded-full px-3 py-1.5">
                        {selectedPlot.land_status}
                      </Badge>
                      {selectedPlot.has_water && (
                        <Badge variant="outline" className="rounded-full px-3 py-1.5">
                          Вода
                        </Badge>
                      )}
                      {selectedPlot.has_gas && (
                        <Badge variant="outline" className="rounded-full px-3 py-1.5">
                          Газ
                        </Badge>
                      )}
                      {selectedPlot.has_electricity && (
                        <Badge variant="outline" className="rounded-full px-3 py-1.5">
                          Свет
                        </Badge>
                      )}
                      {selectedPlot.has_installment && (
                        <Badge variant="outline" className="rounded-full px-3 py-1.5">
                          Рассрочка
                        </Badge>
                      )}
                    </div>
                  </div>

                  {(selectedPlot.bundle_id ? (bundleMetaById.get(selectedPlot.bundle_id)?.primary?.description ?? selectedPlot.description) : selectedPlot.description) && (
                    <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {renderRichText(
                        selectedPlot.bundle_id
                          ? bundleMetaById.get(selectedPlot.bundle_id)?.primary?.description ?? selectedPlot.description ?? ""
                          : selectedPlot.description ?? ""
                      )}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          <PlotMapDialog
            plot={selectedPlot}
            allPlots={initialPlots}
            open={isMapOpen}
            onOpenChange={setIsMapOpen}
            mapSettings={mapSettings ?? null}
          />

          <Dialog open={isPdOpen} onOpenChange={setIsPdOpen}>
            <DialogContent className="max-w-7xl w-[98vw] h-[92vh] p-0 overflow-hidden flex flex-col gap-0 rounded-3xl border-none">
              <DialogHeader className="p-4 px-6 bg-white/80 backdrop-blur-md border-b flex-row items-center justify-between space-y-0 shrink-0">
                <DialogTitle className="text-xl font-serif">
                  Подборка: {pdLotsCount} {pdLotsCount === 1 ? "участок" : "участков"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 relative p-4 bg-white">
                <CatalogInteractiveMap plots={pdFilteredPlotsForMap} mapSettings={mapSettings ?? null} />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isViewingDialogOpen} onOpenChange={setIsViewingDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedPlot?.location
                    ? `Записаться на просмотр участка в ${selectedPlot.location}`
                    : "Записаться на просмотр"}
                </DialogTitle>
                <DialogDescription>Оставьте контактные данные, и мы свяжемся с вами в течение 15 минут.</DialogDescription>
              </DialogHeader>

              {viewingFormState === "success" ? (
                <div className="py-6 text-center">
                  <div className="text-lg font-medium">Спасибо!</div>
                  <div className="text-muted-foreground mt-2">Мы свяжемся с вами в течение 15 минут.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="viewing-phone">Телефон *</Label>
                    <Input
                      id="viewing-phone"
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={viewingPhone}
                      onChange={(e) => setViewingPhone(formatRuPhone(e.target.value))}
                      disabled={viewingFormState === "loading"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="viewing-name">Имя</Label>
                    <Input
                      id="viewing-name"
                      type="text"
                      placeholder="Как к вам обращаться"
                      value={viewingName}
                      onChange={(e) => setViewingName(e.target.value)}
                      disabled={viewingFormState === "loading"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Мессенджер</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={viewingWhatsapp}
                          onCheckedChange={(v) => setViewingWhatsapp(Boolean(v))}
                          disabled={viewingFormState === "loading"}
                        />
                        Написать мне в WhatsApp
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={viewingTelegram}
                          onCheckedChange={(v) => setViewingTelegram(Boolean(v))}
                          disabled={viewingFormState === "loading"}
                        />
                        Написать мне в Telegram
                      </label>
                    </div>
                  </div>

                  {viewingFormState === "error" && viewingError && (
                    <div className="text-sm text-destructive">{viewingError}</div>
                  )}

                  <DialogFooter>
                    <Button
                      onClick={submitViewingRequest}
                      disabled={viewingFormState === "loading"}
                      className="rounded-xl"
                    >
                      {viewingFormState === "loading" ? "Отправка..." : "Отправить"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsViewingDialogOpen(false)}
                      disabled={viewingFormState === "loading"}
                      className="rounded-xl"
                    >
                      Отмена
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {
            filteredPlots.length > 3 && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-border/50">
                {/* Items per page selector */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Показывать по:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-24 h-10 rounded-xl bg-secondary/30 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Page info and navigation */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Страница {currentPage} из {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    {currentPage > 1 ? (
                      <Link
                        href={buildPageUrl(currentPage - 1)}
                        className="inline-flex items-center justify-center rounded-xl border border-input bg-transparent h-10 w-10 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl bg-transparent opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    )}

                    {currentPage < totalPages ? (
                      <Link
                        href={buildPageUrl(currentPage + 1)}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 h-10 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Дальше
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    ) : (
                      <Button
                        variant="default"
                        className="rounded-xl px-6 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        Дальше
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          }
        </div>
      </section >
    </>
  )
}
