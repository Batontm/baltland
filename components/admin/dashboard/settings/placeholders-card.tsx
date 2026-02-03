import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Upload } from "lucide-react"
import type { PlotPlaceholder } from "@/lib/types"

interface PlaceholdersCardProps {
  placeholders: PlotPlaceholder[]
  loading: boolean
  uploading: boolean
  onUpload: (file: File) => void
  onDelete: (id: string) => void
  onPreview: (url: string) => void
}

export function PlaceholdersCard({ placeholders, loading, uploading, onUpload, onDelete, onPreview }: PlaceholdersCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Заглушки для участков (картинки)</CardTitle>
        <CardDescription>Используются как обложка, если у участка нет изображений</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">{loading ? "Загрузка..." : `Заглушек: ${placeholders.length}`}</div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => {
                const el = document.getElementById("placeholder-upload") as HTMLInputElement | null
                el?.click()
              }}
            >
              <Upload className="h-4 w-4" />
              Добавить
            </Button>
            <input
              id="placeholder-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ""
                if (!f) return
                onUpload(f)
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {placeholders.map((p) => (
            <div key={p.id} className="border rounded-lg overflow-hidden">
              <button type="button" className="w-full" onClick={() => onPreview(p.public_url)}>
                <img src={p.public_url} alt="" className="w-full h-24 object-cover" />
              </button>
              <div className="p-2 flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete(p.id)
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
