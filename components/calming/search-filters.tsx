"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { KALININGRAD_DISTRICTS, AREA_OPTIONS, LAND_STATUS_OPTIONS, type FilterParams } from "@/lib/types"

interface SearchFiltersProps {
  onFilter?: (filters: FilterParams) => void
}

export function SearchFilters({ onFilter }: SearchFiltersProps) {
  const [priceRange, setPriceRange] = useState([0, 10000000])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [district, setDistrict] = useState("all")
  const [area, setArea] = useState("all")
  const [landStatus, setLandStatus] = useState("all")
  const [communications, setCommunications] = useState("all")
  const [distanceToSea, setDistanceToSea] = useState("all")
  const [installment, setInstallment] = useState("all")

  const resetAllFilters = () => {
    setPriceRange([0, 10000000])
    setShowAdvanced(false)
    setDistrict("all")
    setArea("all")
    setLandStatus("all")
    setCommunications("all")
    setDistanceToSea("all")
    setInstallment("all")
    onFilter?.({})
  }

  const handleSearch = () => {
    const areaOption = AREA_OPTIONS.find((o) => o.value === area)

    const filters: FilterParams = {
      district: district !== "all" ? district : undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      minArea: areaOption && "min" in areaOption ? areaOption.min : undefined,
      maxArea: areaOption && "max" in areaOption ? areaOption.max : undefined,
      landStatus: landStatus !== "all" ? landStatus : undefined,
      hasGas: communications === "gas" || communications === "full" ? true : undefined,
      hasElectricity: communications === "electric" || communications === "full" ? true : undefined,
      maxDistanceToSea: distanceToSea !== "all" ? Number(distanceToSea) : undefined,
      hasInstallment: installment === "yes" ? true : installment === "no" ? false : undefined,
    }

    onFilter?.(filters)
  }

  return (
    <section className="py-8 relative z-20 -mt-8">
      <div className="container mx-auto px-4">
        <div className="bg-card rounded-3xl shadow-2xl shadow-primary/5 border border-border/50 p-6 lg:p-8">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Район</label>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger className="h-12 rounded-xl bg-secondary/30 border-0 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Все районы" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {KALININGRAD_DISTRICTS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area Size */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Площадь</label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="h-12 rounded-xl bg-secondary/30 border-0 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Любая" />
                </SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2 lg:col-span-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-muted-foreground">Цена</label>
                <span className="text-sm font-medium text-primary">
                  {priceRange[0] === 0 ? "0" : (priceRange[0] / 1000000).toFixed(1)} –{" "}
                  {(priceRange[1] / 1000000).toFixed(1)} млн ₽
                </span>
              </div>
              <div className="pt-2 px-2">
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  min={0}
                  max={10000000}
                  step={100000}
                  className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2"
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleSearch}
                className="h-12 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              >
                <Search className="h-5 w-5 mr-2" />
                Найти
              </Button>
              <Button
                variant="outline"
                onClick={resetAllFilters}
                className="h-12 rounded-xl"
              >
                Сброс
              </Button>
            </div>
          </div>

          {/* Toggle Advanced */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showAdvanced ? "Скрыть фильтры" : "Расширенный поиск"}
              {showAdvanced && <X className="h-4 w-4" />}
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50 animate-fade-in">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Статус</label>
                <Select value={landStatus} onValueChange={setLandStatus}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-0">
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
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-0">
                    <SelectValue placeholder="Любые" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любые</SelectItem>
                    <SelectItem value="full">Все подведены</SelectItem>
                    <SelectItem value="gas">С газом</SelectItem>
                    <SelectItem value="electric">Со светом</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">До моря</label>
                <Select value={distanceToSea} onValueChange={setDistanceToSea}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-0">
                    <SelectValue placeholder="Любое" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любое</SelectItem>
                    <SelectItem value="1">До 1 км</SelectItem>
                    <SelectItem value="3">До 3 км</SelectItem>
                    <SelectItem value="5">До 5 км</SelectItem>
                    <SelectItem value="10">До 10 км</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Рассрочка</label>
                <Select value={installment} onValueChange={setInstallment}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-0">
                    <SelectValue placeholder="Не важно" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Не важно</SelectItem>
                    <SelectItem value="yes">С рассрочкой</SelectItem>
                    <SelectItem value="no">Без рассрочки</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
