import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText } from "lucide-react"
import type { CommercialProposalWithDetails } from "@/lib/types"
import { PROPOSAL_STATUS_OPTIONS } from "@/lib/types"

interface ProposalPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: CommercialProposalWithDetails | null
  leadName: string | null
  leadPhone: string | null
  onPrint: () => void
}

export function ProposalPreviewDialog({ open, onOpenChange, proposal, leadName, leadPhone, onPrint }: ProposalPreviewDialogProps) {
  if (!proposal) return null

  const plots = proposal.commercial_proposal_plots?.map((pp) => pp.plot) || []
  const settlementMap = new Map<string, { district: string; description: string; cadastrals: string[] }>()

  for (const plot of plots) {
    const settlement = (plot.location || "Населенный пункт не указан").trim()
    const district = (plot.district || "Район не указан").trim()
    const description = (plot.description || "").trim()
    const cadastrals = [
      ...(plot.cadastral_number ? [plot.cadastral_number] : []),
      ...(plot.additional_cadastral_numbers || []),
    ]
      .map((cn) => String(cn || "").trim())
      .filter(Boolean)

    if (!settlementMap.has(settlement)) {
      settlementMap.set(settlement, {
        district,
        description,
        cadastrals: [],
      })
    }

    const current = settlementMap.get(settlement)!
    if (!current.description && description) current.description = description
    for (const cn of cadastrals) {
      if (!current.cadastrals.includes(cn)) current.cadastrals.push(cn)
    }
  }

  const settlementGroups = Array.from(settlementMap.entries())
    .map(([settlement, data]) => ({
      settlement,
      district: data.district,
      description: data.description || "Описание поселка не указано",
      cadastrals: data.cadastrals,
    }))
    .sort((a, b) => a.settlement.localeCompare(b.settlement, "ru"))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Коммерческое предложение</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-2xl font-bold mb-2">{proposal.title}</h2>
            {proposal.description && <p className="text-muted-foreground">{proposal.description}</p>}
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span>
                Клиент: <strong>{leadName || proposal.lead?.name || "—"}</strong>
              </span>
              <span>
                Телефон: <strong>{leadPhone || ""}</strong>
              </span>
              <Badge className={PROPOSAL_STATUS_OPTIONS.find((s) => s.value === proposal.status)?.color}>
                {PROPOSAL_STATUS_OPTIONS.find((s) => s.value === proposal.status)?.label}
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Подобранные поселки ({settlementGroups.length})</h3>
            <div className="space-y-4">
              {settlementGroups.map((group) => {
                return (
                  <div key={group.settlement} className="rounded-xl border p-4">
                    <h4 className="font-semibold text-lg mb-1">{group.settlement}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{group.district}</p>
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">{group.description}</p>

                    <div className="text-sm">
                      <div className="text-muted-foreground mb-2">Кадастровые номера ({group.cadastrals.length})</div>
                      {group.cadastrals.length > 0 ? (
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs">
                          {group.cadastrals.map((cn) => (
                            <div key={cn}>{cn}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Кадастровые номера не указаны</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
            <Button onClick={onPrint} className="bg-primary">
              <FileText className="mr-2 h-4 w-4" />
              Сохранить в PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
