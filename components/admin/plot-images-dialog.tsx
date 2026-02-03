"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2, Star, Upload } from "lucide-react"
import type { LandPlotImage } from "@/lib/types"

interface PlotImagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plotId: string | null
  plotTitle?: string
  onChanged?: () => void
}

export function PlotImagesDialog({ open, onOpenChange, plotId, plotTitle, onChanged }: PlotImagesDialogProps) {
  const [images, setImages] = useState<LandPlotImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const canLoad = useMemo(() => open && !!plotId, [open, plotId])

  const loadImages = async () => {
    if (!plotId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/plots/${plotId}/images`, { cache: "no-store" })
      const json = await res.json()
      if (json?.success) setImages(json.images || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canLoad) return
    loadImages()
  }, [canLoad])

  const handleUpload = async (file: File, makeCover: boolean) => {
    if (!plotId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("makeCover", makeCover ? "true" : "false")

      const res = await fetch(`/api/admin/plots/${plotId}/images`, {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || "Ошибка загрузки")
        return
      }
      await loadImages()
      onChanged?.()
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!plotId) return
    if (!confirm("Удалить изображение?") ) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/plots/${plotId}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })
      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || "Ошибка удаления")
        return
      }
      await loadImages()
      onChanged?.()
    } finally {
      setLoading(false)
    }
  }

  const handleSetCover = async (imageId: string) => {
    if (!plotId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/plots/${plotId}/images`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      })
      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || "Ошибка")
        return
      }
      await loadImages()
      onChanged?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Фото участка</DialogTitle>
          <DialogDescription>{plotTitle || ""}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {loading ? "Загрузка..." : `Изображений: ${images.length}`}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!plotId || uploading}
              onClick={() => {
                const el = document.getElementById("plot-image-upload") as HTMLInputElement | null
                el?.click()
              }}
            >
              <Upload className="h-4 w-4" />
              Загрузить
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!plotId || uploading}
              onClick={() => {
                const el = document.getElementById("plot-image-upload-cover") as HTMLInputElement | null
                el?.click()
              }}
            >
              <Star className="h-4 w-4" />
              Загрузить как обложку
            </Button>

            <input
              id="plot-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ""
                if (!f) return
                void handleUpload(f, false)
              }}
            />

            <input
              id="plot-image-upload-cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ""
                if (!f) return
                void handleUpload(f, true)
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full"
                onClick={() => setPreviewUrl(img.public_url)}
              >
                <img src={img.public_url} alt="" className="w-full h-32 object-cover" />
              </button>
              <div className="p-2 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground truncate">
                  {img.is_cover ? "Обложка" : ""}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleSetCover(img.id)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleDelete(img.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {previewUrl && (
          <Dialog open={true} onOpenChange={() => setPreviewUrl(null)}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Предпросмотр</DialogTitle>
              </DialogHeader>
              <img src={previewUrl} alt="" className="w-full max-h-[70vh] object-contain" />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
