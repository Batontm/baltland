"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { AddressCombobox } from "@/components/ui/address-combobox"
import { LAND_STATUS_OPTIONS, type CommercialProposalWithDetails, type District, type LandPlot, type Settlement } from "@/lib/types"

interface UniversalProposalToolProps {
  plots: LandPlot[]
  districts: District[]
  loadingAddresses: boolean
  onLoadSettlements: (districtName: string) => Promise<Settlement[]>
  onPreviewProposal: (proposal: CommercialProposalWithDetails, leadName: string, leadPhone: string) => void
  onDownloadPdf: (proposal: CommercialProposalWithDetails, leadName: string, leadPhone: string) => void
  onSaveDraftToCRM: (payload: {
    leadName: string
    leadPhone: string
    title: string
    description: string
    selectedPlotIds: string[]
  }) => Promise<{ success: boolean; error?: string }>
}

const KALININGRAD_CENTER = {
  lat: 54.710426,
  lon: 20.452214,
}

function toNumber(value: string): number | null {
  if (!value.trim()) return null
  const normalized = value.replace(",", ".")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function buildSelectablePlots(sourcePlots: LandPlot[]): LandPlot[] {
  const singlePlots = sourcePlots.filter((plot) => !plot.bundle_id)
  const bundleMap = new Map<string, LandPlot[]>()

  sourcePlots.forEach((plot) => {
    if (!plot.bundle_id) return
    if (!bundleMap.has(plot.bundle_id)) bundleMap.set(plot.bundle_id, [])
    bundleMap.get(plot.bundle_id)!.push(plot)
  })

  const bundleRepresentatives = Array.from(bundleMap.values())
    .map((bundlePlots) => {
      const representative =
        bundlePlots.find((plot) => plot.is_bundle_primary) ||
        bundlePlots.find((plot) => Number(plot.price || 0) > 0) ||
        bundlePlots[0]

      const cadastralSet = new Set<string>()
      bundlePlots.forEach((plot) => {
        if (plot.cadastral_number) cadastralSet.add(plot.cadastral_number)
        ;(plot.additional_cadastral_numbers || []).forEach((cn) => {
          if (cn) cadastralSet.add(cn)
        })
      })

      const orderedCadastrals = Array.from(cadastralSet)
      const primaryCadastral = representative.cadastral_number || orderedCadastrals[0] || null

      return {
        ...representative,
        cadastral_number: primaryCadastral,
        additional_cadastral_numbers: orderedCadastrals.filter((cn) => cn !== primaryCadastral),
      } as LandPlot
    })

  return [...singlePlots, ...bundleRepresentatives]
}

export function UniversalProposalTool({
  plots,
  districts,
  loadingAddresses,
  onLoadSettlements,
  onPreviewProposal,
  onDownloadPdf,
  onSaveDraftToCRM,
}: UniversalProposalToolProps) {
  const [title, setTitle] = useState("Коммерческое предложение")
  const [description, setDescription] = useState("")
  const [leadName, setLeadName] = useState("Клиент")
  const [leadPhone, setLeadPhone] = useState("")

  const [districtFilter, setDistrictFilter] = useState("all")
  const [settlementFilter, setSettlementFilter] = useState("all")
  const [settlements, setSettlements] = useState<Settlement[]>([])

  const [searchFilter, setSearchFilter] = useState("")
  const [cadastralFilter, setCadastralFilter] = useState("")
  const [landStatusFilter, setLandStatusFilter] = useState("all")
  const [ownershipFilter, setOwnershipFilter] = useState("all")

  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [minArea, setMinArea] = useState("")
  const [maxArea, setMaxArea] = useState("")
  const [maxDistanceToCenterKm, setMaxDistanceToCenterKm] = useState("")
  const [maxDistanceToSeaKm, setMaxDistanceToSeaKm] = useState("")

  const [needGas, setNeedGas] = useState(false)
  const [needElectricity, setNeedElectricity] = useState(false)
  const [needWater, setNeedWater] = useState(false)
  const [needInstallment, setNeedInstallment] = useState(false)
  const [excludeReserved, setExcludeReserved] = useState(true)
  const [onlyActive, setOnlyActive] = useState(true)

  const [selectedPlots, setSelectedPlots] = useState<string[]>([])
  const [savingDraft, setSavingDraft] = useState(false)
  const [showFilteredResults, setShowFilteredResults] = useState(false)

  const selectablePlots = useMemo(() => buildSelectablePlots(plots), [plots])

  useEffect(() => {
    const loadSettlements = async () => {
      if (!districtFilter || districtFilter === "all") {
        setSettlements([])
        return
      }
      const data = await onLoadSettlements(districtFilter)
      setSettlements(data)
    }

    void loadSettlements()
  }, [districtFilter, onLoadSettlements])

  const filteredPlots = useMemo(() => {
    if (!showFilteredResults) return []

    const minPriceNum = toNumber(minPrice)
    const maxPriceNum = toNumber(maxPrice)
    const minAreaNum = toNumber(minArea)
    const maxAreaNum = toNumber(maxArea)
    const maxDistanceNum = toNumber(maxDistanceToCenterKm)
    const maxSeaDistanceNum = toNumber(maxDistanceToSeaKm)

    return selectablePlots.filter((plot) => {
      if (onlyActive && !plot.is_active) return false
      if (excludeReserved && plot.is_reserved) return false

      if (districtFilter !== "all" && plot.district !== districtFilter) return false
      if (settlementFilter !== "all" && plot.location !== settlementFilter) return false

      if (landStatusFilter !== "all" && plot.land_status !== landStatusFilter) return false
      if (ownershipFilter !== "all" && (plot.ownership_type || "ownership") !== ownershipFilter) return false

      if (needGas && !plot.has_gas) return false
      if (needElectricity && !plot.has_electricity) return false
      if (needWater && !plot.has_water) return false
      if (needInstallment && !plot.has_installment) return false

      const price = Number(plot.price || 0)
      const area = Number(plot.area_sotok || 0)
      const distanceToSea = typeof plot.distance_to_sea === "number" ? plot.distance_to_sea : null

      if (price <= 0) return false

      if (minPriceNum !== null && price < minPriceNum) return false
      if (maxPriceNum !== null && price > maxPriceNum) return false
      if (minAreaNum !== null && area < minAreaNum) return false
      if (maxAreaNum !== null && area > maxAreaNum) return false

      if (maxSeaDistanceNum !== null) {
        if (distanceToSea === null || distanceToSea > maxSeaDistanceNum) return false
      }

      if (maxDistanceNum !== null) {
        if (typeof plot.center_lat !== "number" || typeof plot.center_lon !== "number") return false
        const distance = haversineKm(plot.center_lat, plot.center_lon, KALININGRAD_CENTER.lat, KALININGRAD_CENTER.lon)
        if (distance > maxDistanceNum) return false
      }

      const search = searchFilter.trim().toLowerCase()
      if (search) {
        const haystack = [
          plot.title || "",
          plot.location || "",
          plot.district || "",
          plot.cadastral_number || "",
          plot.description || "",
        ]
          .join(" ")
          .toLowerCase()

        if (!haystack.includes(search)) return false
      }

      const cadastral = cadastralFilter.trim().toLowerCase()
      if (cadastral) {
        const current = (plot.cadastral_number || "").toLowerCase()
        const additional = (plot.additional_cadastral_numbers || []).join(" ").toLowerCase()
        if (!current.includes(cadastral) && !additional.includes(cadastral)) return false
      }

      return true
    })
  }, [
    selectablePlots,
    onlyActive,
    excludeReserved,
    districtFilter,
    settlementFilter,
    landStatusFilter,
    ownershipFilter,
    needGas,
    needElectricity,
    needWater,
    needInstallment,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    maxDistanceToCenterKm,
    maxDistanceToSeaKm,
    searchFilter,
    cadastralFilter,
    showFilteredResults,
  ])

  const selectedPlotEntities = useMemo(
    () => selectablePlots.filter((plot) => selectedPlots.includes(plot.id)),
    [selectablePlots, selectedPlots]
  )

  useEffect(() => {
    setShowFilteredResults(false)
    setSelectedPlots([])
  }, [
    districtFilter,
    settlementFilter,
    searchFilter,
    cadastralFilter,
    landStatusFilter,
    ownershipFilter,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    maxDistanceToCenterKm,
    maxDistanceToSeaKm,
    needGas,
    needElectricity,
    needWater,
    needInstallment,
    excludeReserved,
    onlyActive,
  ])

  const togglePlot = (plotId: string) => {
    setSelectedPlots((prev) => (prev.includes(plotId) ? prev.filter((id) => id !== plotId) : [...prev, plotId]))
  }

  const selectAllFiltered = () => {
    if (!showFilteredResults) return
    setSelectedPlots(filteredPlots.map((plot) => plot.id))
  }

  const selectAllPlots = () => {
    setSelectedPlots(selectablePlots.filter((plot) => Number(plot.price || 0) > 0).map((plot) => plot.id))
  }

  const clearAllFilters = () => {
    setDistrictFilter("all")
    setSettlementFilter("all")
    setSearchFilter("")
    setCadastralFilter("")
    setLandStatusFilter("all")
    setOwnershipFilter("all")
    setMinPrice("")
    setMaxPrice("")
    setMinArea("")
    setMaxArea("")
    setMaxDistanceToCenterKm("")
    setMaxDistanceToSeaKm("")
    setNeedGas(false)
    setNeedElectricity(false)
    setNeedWater(false)
    setNeedInstallment(false)
    setExcludeReserved(true)
    setOnlyActive(true)
    setShowFilteredResults(false)
    setSelectedPlots([])
  }

  const buildManualProposal = (): CommercialProposalWithDetails | null => {
    if (selectedPlotEntities.length === 0) {
      return null
    }

    const nowIso = new Date().toISOString()
    const proposalId = `manual-${Date.now()}`

    return {
      id: proposalId,
      lead_id: "manual",
      title: title.trim() || "Коммерческое предложение",
      description: description.trim() || null,
      status: "draft",
      created_by: null,
      created_at: nowIso,
      updated_at: nowIso,
      sent_at: null,
      commercial_proposal_plots: selectedPlotEntities.map((plot, index) => ({
        id: `${proposalId}-${plot.id}`,
        proposal_id: proposalId,
        plot_id: plot.id,
        sort_order: index,
        custom_note: null,
        created_at: nowIso,
        plot,
      })),
    }
  }

  const buildProposalPreview = () => {
    const proposal = buildManualProposal()
    if (!proposal) {
      alert("Выберите хотя бы один участок")
      return
    }

    onPreviewProposal(proposal, leadName.trim() || "Клиент", leadPhone.trim() || "")
  }

  const handleDownloadPdf = () => {
    const proposal = buildManualProposal()
    if (!proposal) {
      alert("Выберите хотя бы один участок")
      return
    }

    onDownloadPdf(proposal, leadName.trim() || "Клиент", leadPhone.trim() || "")
  }

  const handleSaveDraftToCRM = async () => {
    if (selectedPlots.length === 0) {
      alert("Выберите хотя бы один участок")
      return
    }

    setSavingDraft(true)
    const result = await onSaveDraftToCRM({
      leadName: leadName.trim(),
      leadPhone: leadPhone.trim(),
      title: title.trim() || "Коммерческое предложение",
      description: description.trim(),
      selectedPlotIds: selectedPlots,
    })
    setSavingDraft(false)

    if (!result.success) {
      alert(result.error || "Не удалось сохранить черновик КП")
      return
    }

    alert("Черновик КП сохранен в CRM")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Универсальный конструктор КП</h2>
        <p className="text-muted-foreground mt-1">
          Подберите участки по любому запросу, сформируйте коммерческое предложение и скачайте PDF без привязки к заявке.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Параметры предложения</CardTitle>
          <CardDescription>Название, описание и данные клиента для PDF</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Название КП</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Подборка до 1.5 млн" />
          </div>
          <div className="space-y-2">
            <Label>Имя клиента</Label>
            <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Клиент" />
          </div>
          <div className="space-y-2">
            <Label>Телефон клиента</Label>
            <Input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="+7..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Комментарий к КП</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Например: В радиусе до 12 км от центра, с электричеством и площадью от 6 соток"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Фильтры подбора</CardTitle>
          <CardDescription>Используйте любые комбинации параметров</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Район</Label>
              <AddressCombobox
                value={districtFilter === "all" ? "" : districtFilter}
                onValueChange={(value) => {
                  setDistrictFilter(value || "all")
                  setSettlementFilter("all")
                }}
                options={districts.map((d) => ({ id: d.id, name: d.name }))}
                placeholder="Все районы"
                searchPlaceholder="Поиск района..."
                emptyText="Район не найден"
                loading={loadingAddresses}
              />
            </div>

            <div className="space-y-2">
              <Label>Населенный пункт</Label>
              <AddressCombobox
                value={settlementFilter === "all" ? "" : settlementFilter}
                onValueChange={(value) => setSettlementFilter(value || "all")}
                options={settlements.map((s) => ({ id: s.id, name: s.name }))}
                placeholder="Все населенные пункты"
                searchPlaceholder="Поиск населенного пункта..."
                emptyText="Населенный пункт не найден"
                disabled={!districtFilter || districtFilter === "all"}
                loading={loadingAddresses}
              />
            </div>

            <div className="space-y-2">
              <Label>Кадастровый номер</Label>
              <Input value={cadastralFilter} onChange={(e) => setCadastralFilter(e.target.value)} placeholder="39:03:..." />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Общий поиск</Label>
              <Input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="По названию, локации, описанию" />
            </div>
            <div className="space-y-2">
              <Label>Статус земли (ВРИ)</Label>
              <Select value={landStatusFilter} onValueChange={setLandStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Любой" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любой</SelectItem>
                  {LAND_STATUS_OPTIONS.filter((s) => s.value !== "all").map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Право</Label>
              <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Любое" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любое</SelectItem>
                  <SelectItem value="ownership">Собственность</SelectItem>
                  <SelectItem value="lease">Аренда</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Цена от, ₽</Label>
              <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="1000000" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Цена до, ₽</Label>
              <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="1500000" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Радиус от центра Калининграда, км</Label>
              <Input value={maxDistanceToCenterKm} onChange={(e) => setMaxDistanceToCenterKm(e.target.value)} placeholder="12" inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Площадь от, сот</Label>
              <Input value={minArea} onChange={(e) => setMinArea(e.target.value)} placeholder="6" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Площадь до, сот</Label>
              <Input value={maxArea} onChange={(e) => setMaxArea(e.target.value)} placeholder="20" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>До моря, км (макс)</Label>
              <Input value={maxDistanceToSeaKm} onChange={(e) => setMaxDistanceToSeaKm(e.target.value)} placeholder="15" inputMode="decimal" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm">Нужно электричество</span>
              <Switch checked={needElectricity} onCheckedChange={setNeedElectricity} />
            </label>
            <label className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm">Нужен газ</span>
              <Switch checked={needGas} onCheckedChange={setNeedGas} />
            </label>
            <label className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm">Нужна вода</span>
              <Switch checked={needWater} onCheckedChange={setNeedWater} />
            </label>
            <label className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm">Только с рассрочкой</span>
              <Switch checked={needInstallment} onCheckedChange={setNeedInstallment} />
            </label>
            <label className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm">Только активные</span>
              <Switch checked={onlyActive} onCheckedChange={setOnlyActive} />
            </label>
            <label className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm">Исключить бронь</span>
              <Switch checked={excludeReserved} onCheckedChange={setExcludeReserved} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button onClick={() => setShowFilteredResults(true)}>Показать</Button>
            <Button variant="outline" onClick={clearAllFilters}>Сбросить фильтры</Button>
            <Button variant="outline" onClick={selectAllPlots}>Выбрать все участки</Button>
            <Button variant="outline" onClick={selectAllFiltered} disabled={!showFilteredResults}>Выбрать всю выдачу</Button>
            <Button variant="ghost" onClick={() => setSelectedPlots([])}>Очистить выбор</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Результаты подбора</CardTitle>
              <CardDescription>
                {showFilteredResults
                  ? `Найдено: ${filteredPlots.length} • Выбрано: ${selectedPlots.length}`
                  : "Заполните фильтры и нажмите «Показать»"}
              </CardDescription>
            </div>
            <Button onClick={buildProposalPreview} disabled={selectedPlots.length === 0} className="bg-green-600 hover:bg-green-700">
              Открыть КП
            </Button>
            <Button onClick={handleDownloadPdf} disabled={selectedPlots.length === 0}>
              Скачать PDF
            </Button>
            <Button onClick={handleSaveDraftToCRM} disabled={selectedPlots.length === 0 || savingDraft} variant="outline">
              {savingDraft ? "Сохранение..." : "Сохранить как черновик КП в CRM"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
          {!showFilteredResults ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Список участков скрыт до нажатия «Показать»</p>
          ) : filteredPlots.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">По выбранным фильтрам участки не найдены</p>
          ) : (
            filteredPlots.map((plot) => {
              const checked = selectedPlots.includes(plot.id)
              const hasCoords = typeof plot.center_lat === "number" && typeof plot.center_lon === "number"
              const cityDistance = hasCoords
                ? haversineKm(plot.center_lat as number, plot.center_lon as number, KALININGRAD_CENTER.lat, KALININGRAD_CENTER.lon)
                : null

              return (
                <label key={plot.id} className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/40">
                  <Checkbox checked={checked} onCheckedChange={() => togglePlot(plot.id)} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium">{plot.title || "Без названия"}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{Number(plot.area_sotok || 0)} сот.</Badge>
                        <Badge className="bg-emerald-600">{new Intl.NumberFormat("ru-RU").format(Number(plot.price || 0))} ₽</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plot.district || "Район не указан"} • {plot.location || "Населенный пункт не указан"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      КН: {plot.cadastral_number || "—"}
                      {(plot.additional_cadastral_numbers?.length || 0) > 0 ? ` (+${plot.additional_cadastral_numbers!.length} в лоте)` : ""}
                      {cityDistance !== null ? ` • ~${cityDistance.toFixed(1)} км до центра` : " • расстояние до центра: нет координат"}
                    </p>
                    {(plot.additional_cadastral_numbers?.length || 0) > 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        Лот: кадастровые номера продаются только вместе
                      </p>
                    )}
                  </div>
                </label>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
