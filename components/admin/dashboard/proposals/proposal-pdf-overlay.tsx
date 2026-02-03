import { Button } from "@/components/ui/button"
import type { CommercialProposalWithDetails, OrganizationSettings } from "@/lib/types"
import ProposalPDFView from "@/components/admin/proposal-pdf-view"

interface ProposalPDFOverlayProps {
  open: boolean
  proposal: CommercialProposalWithDetails | null
  settings: OrganizationSettings | null
  onClose: () => void
}

export function ProposalPDFOverlay({ open, proposal, settings, onClose }: ProposalPDFOverlayProps) {
  if (!open || !proposal) return null

  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-auto print:block">
      <div className="print:hidden p-4 bg-muted border-b flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Сохранение в PDF</p>
        <Button variant="outline" onClick={onClose}>
          Закрыть
        </Button>
      </div>
      <ProposalPDFView proposal={proposal} settings={settings} />
    </div>
  )
}
