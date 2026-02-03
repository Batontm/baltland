import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AddressCombobox } from "@/components/ui/address-combobox"
import { Check } from "lucide-react"
import type { District, LandPlot, Lead, Settlement } from "@/lib/types"

interface CreateProposalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  selectedLead: Lead | null

  proposalTitle: string
  proposalDescription: string
  onChangeProposalTitle: (v: string) => void
  onChangeProposalDescription: (v: string) => void

  districts: District[]
  settlements: Settlement[]
  loadingAddresses: boolean

  districtFilter: string
  settlementFilter: string
  cadastralFilter: string
  onChangeDistrictFilter: (v: string) => void
  onChangeSettlementFilter: (v: string) => void
  onChangeCadastralFilter: (v: string) => void

  selectedPlots: string[]
  onClearSelectedPlots: () => void

  filteredPlotsForProposal: LandPlot[]
  onTogglePlotSelection: (plotId: string) => void
  onSelectAllPlotsInDistrict: (districtName: string) => void

  loading: boolean
  onCreateProposal: () => void
}

export function CreateProposalDialog({
  open,
  onOpenChange,
  selectedLead,
  proposalTitle,
  proposalDescription,
  onChangeProposalTitle,
  onChangeProposalDescription,
  districts,
  settlements,
  loadingAddresses,
  districtFilter,
  settlementFilter,
  cadastralFilter,
  onChangeDistrictFilter,
  onChangeSettlementFilter,
  onChangeCadastralFilter,
  selectedPlots,
  onClearSelectedPlots,
  filteredPlotsForProposal,
  onTogglePlotSelection,
  onSelectAllPlotsInDistrict,
  loading,
  onCreateProposal,
}: CreateProposalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создание коммерческого предложения</DialogTitle>
        </DialogHeader>

        {selectedLead && (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedLead.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.phone}</p>
                  </div>
                  {selectedLead.wishes && <p className="text-sm italic max-w-md">{selectedLead.wishes}</p>}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Название КП</Label>
              <Input
                value={proposalTitle}
                onChange={(e) => onChangeProposalTitle(e.target.value)}
                placeholder="Коммерческое предложение..."
              />
            </div>

            <div className="space-y-2">
              <Label>Описание (опционально)</Label>
              <Textarea
                value={proposalDescription}
                onChange={(e) => onChangeProposalDescription(e.target.value)}
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Район</Label>
                <AddressCombobox
                  value={districtFilter === "all" ? "" : districtFilter}
                  onValueChange={(value) => {
                    onChangeDistrictFilter(value || "all")
                    onChangeSettlementFilter("")
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
                  onValueChange={(value) => onChangeSettlementFilter(value || "all")}
                  options={settlements.map((s) => ({ id: s.id, name: s.name }))}
                  placeholder={!districtFilter || districtFilter === "all" ? "Сначала выберите район" : "Все населенные пункты"}
                  searchPlaceholder="Поиск населенного пункта..."
                  emptyText="Населенный пункт не найден"
                  disabled={!districtFilter || districtFilter === "all"}
                  loading={loadingAddresses}
                />
              </div>

              <div className="space-y-2">
                <Label>Кадастровый номер</Label>
                <Input
                  placeholder="Введите кадастровый номер"
                  value={cadastralFilter}
                  onChange={(e) => onChangeCadastralFilter(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onChangeDistrictFilter("all")
                  onChangeSettlementFilter("all")
                  onChangeCadastralFilter("")
                }}
              >
                Сброс всех фильтров
              </Button>
            </div>

            {districtFilter !== "all" && (
              <Button variant="outline" size="sm" onClick={() => onSelectAllPlotsInDistrict(districtFilter)}>
                Выбрать все участки в {districtFilter}
              </Button>
            )}

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">Выбрано участков: {selectedPlots.length}</span>
              {selectedPlots.length > 0 && (
                <Button variant="ghost" size="sm" onClick={onClearSelectedPlots}>
                  Очистить выбор
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
              {filteredPlotsForProposal.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Нет доступных участков</p>
              ) : (
                filteredPlotsForProposal.map((plot) => (
                  <div
                    key={plot.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlots.includes(plot.id) ? "bg-green-50 border-green-500" : "hover:bg-muted/50"
                    }`}
                    onClick={() => onTogglePlotSelection(plot.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{plot.title}</h4>
                        <p className="text-sm text-muted-foreground">{plot.district}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>{plot.area_sotok} соток</span>
                          <span className="font-semibold">{plot.price.toLocaleString()} ₽</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {selectedPlots.includes(plot.id) && <Check className="h-5 w-5 text-green-600" />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button
                onClick={onCreateProposal}
                disabled={loading || selectedPlots.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Создание..." : `Создать КП с ${selectedPlots.length} участками`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
