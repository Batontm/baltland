"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AddressCombobox } from "@/components/ui/address-combobox"
import type { District, Settlement } from "@/lib/types"
import { getDistricts, getSettlementsByDistrictName, clearLandPlotsBySettlement } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"

interface ClearSettlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCleared?: () => void
}

export function ClearSettlementDialog({ open, onOpenChange, onCleared }: ClearSettlementDialogProps) {
  const { toast } = useToast()
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [districts, setDistricts] = useState<District[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [selectedDistrict, setSelectedDistrict] = useState("all")
  const [selectedSettlement, setSelectedSettlement] = useState("")
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (!open) return

    const run = async () => {
      setLoadingAddresses(true)
      try {
        const data = await getDistricts()
        setDistricts(data)
      } catch (error) {
        console.error("[ClearSettlementDialog] Error loading districts:", error)
      } finally {
        setLoadingAddresses(false)
      }
    }

    void run()
  }, [open])

  const handleDistrictChange = async (districtName: string) => {
    setSelectedDistrict(districtName || "all")
    setSelectedSettlement("")

    if (!districtName || districtName === "all") {
      setSettlements([])
      return
    }

    setLoadingAddresses(true)
    try {
      const data = await getSettlementsByDistrictName(districtName)
      setSettlements(data)
    } catch (error) {
      console.error("[ClearSettlementDialog] Error loading settlements:", error)
      setSettlements([])
    } finally {
      setLoadingAddresses(false)
    }
  }

  const canSubmit = selectedDistrict !== "all" && !!selectedSettlement && !clearing

  const handleClear = async () => {
    if (!canSubmit) return

    setClearing(true)
    try {
      const res = await clearLandPlotsBySettlement(selectedDistrict, selectedSettlement)
      toast({
        title: res.success ? "Очистка выполнена" : "Ошибка очистки",
        description: res.message,
        variant: res.success ? "default" : "destructive",
      })

      if (res.success) {
        onCleared?.()
        onOpenChange(false)
        setSelectedDistrict("all")
        setSelectedSettlement("")
        setSettlements([])
      }
    } finally {
      setClearing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Очистка участков по поселку</DialogTitle>
          <DialogDescription>
            Будут удалены все земельные участки в выбранном поселке. Операция необратима.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Район</Label>
            <AddressCombobox
              value={selectedDistrict === "all" ? "" : selectedDistrict}
              onValueChange={(value) => void handleDistrictChange(value || "all")}
              options={districts.map((d) => ({ id: d.id, name: d.name }))}
              placeholder="Выберите район"
              searchPlaceholder="Поиск района..."
              emptyText="Район не найден"
              loading={loadingAddresses}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Населенный пункт</Label>
            <AddressCombobox
              value={selectedSettlement}
              onValueChange={(value) => setSelectedSettlement(value)}
              options={settlements.map((s) => ({ id: s.id, name: s.name }))}
              placeholder={!selectedDistrict || selectedDistrict === "all" ? "Сначала выберите район" : "Выберите населенный пункт"}
              searchPlaceholder="Поиск населенного пункта..."
              emptyText="Населенный пункт не найден"
              disabled={!selectedDistrict || selectedDistrict === "all"}
              loading={loadingAddresses}
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={clearing}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleClear} disabled={!canSubmit}>
            {clearing ? "Очищаем..." : "Очистить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
