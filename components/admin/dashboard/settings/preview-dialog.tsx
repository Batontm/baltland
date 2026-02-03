import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PreviewDialogProps {
  url: string | null
  onClose: () => void
}

export function PreviewDialog({ url, onClose }: PreviewDialogProps) {
  if (!url) return null

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Предпросмотр</DialogTitle>
        </DialogHeader>
        <img src={url} alt="" className="w-full max-h-[70vh] object-contain" />
      </DialogContent>
    </Dialog>
  )
}
