import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText } from "lucide-react"
import type { CommercialProposalWithDetails } from "@/lib/types"
import { PROPOSAL_STATUS_OPTIONS } from "@/lib/types"

interface ProposalPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: CommercialProposalWithDetails | null
  leadPhone: string | null
  onPrint: () => void
}

export function ProposalPreviewDialog({ open, onOpenChange, proposal, leadPhone, onPrint }: ProposalPreviewDialogProps) {
  if (!proposal) return null

  const plots = proposal.commercial_proposal_plots?.map((pp) => pp.plot) || []
  const plotsBySettlement = plots.reduce<Record<string, typeof plots>>((acc, plot) => {
    const key = plot.location || "(поселок не указан)"
    if (!acc[key]) acc[key] = []
    acc[key].push(plot)
    return acc
  }, {})

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
                Клиент: <strong>{proposal.lead?.name}</strong>
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
            <h3 className="text-lg font-semibold mb-4">Подобранные участки ({plots.length})</h3>
            <div className="space-y-4">
              {Object.entries(plotsBySettlement).map(([settlement, groupPlots]) => {
                const representative = groupPlots[0]
                const cadastralNumbers = groupPlots
                  .map((p) => p.cadastral_number)
                  .filter(Boolean) as string[]

                return (
                  <Card key={settlement} className="p-4">
                    <div className="flex gap-4">
                      {representative?.image_url && (
                        <img
                          src={representative.image_url}
                          alt={settlement}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1">{settlement}</h4>
                        {representative?.description && (
                          <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">
                            {representative.description}
                          </p>
                        )}

                        <div className="text-sm">
                          <div className="text-muted-foreground mb-2">Кадастровые номера ({groupPlots.length})</div>
                          {cadastralNumbers.length > 0 ? (
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs">
                              {cadastralNumbers.map((cn) => (
                                <div key={cn}>{cn}</div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">Кадастровые номера не указаны</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
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
