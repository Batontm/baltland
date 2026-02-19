"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/admin/dashboard/rich-text-editor"
import type { News } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { Edit, Newspaper, Plus, Trash2, Upload, X } from "lucide-react"
import { useState } from "react"
import { NewsParserWidget } from "@/components/admin/dashboard/news-parser-widget"
import { ImageCropDialog } from "@/components/admin/dashboard/image-crop-dialog"

interface NewsTabProps {
  news: News[]
  newsFormData: Partial<News>
  isCreatingNews: boolean
  editingNews: News | null
  loading: boolean
  onCreate: () => void
  onCancel: () => void
  onSave: () => void
  onEdit: (newsItem: News) => void
  onDelete: (id: string) => void
  onChangeForm: (patch: Partial<News>) => void
  onRefresh?: () => void
}

export function NewsTab({
  news,
  newsFormData,
  isCreatingNews,
  editingNews,
  loading,
  onCreate,
  onCancel,
  onSave,
  onEdit,
  onDelete,
  onChangeForm,
  onRefresh,
}: NewsTabProps) {
  const [uploadingImage, setUploadingImage] = useState(false)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  /** Загрузить Blob или File на сервер */
  const handleUploadImage = async (fileOrBlob: File | Blob) => {
    setUploadingImage(true)
    try {
      const fd = new FormData()
      // Если это Blob (после кропа), оборачиваем в File с именем
      const file = fileOrBlob instanceof File
        ? fileOrBlob
        : new File([fileOrBlob], "cropped-image.webp", { type: fileOrBlob.type })
      fd.append("file", file)

      const res = await fetch("/api/admin/news/image", {
        method: "POST",
        body: fd,
      })
      const contentType = res.headers.get("content-type") || ""
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        alert(text || `Ошибка загрузки (HTTP ${res.status})`)
        return
      }

      if (!contentType.toLowerCase().includes("application/json")) {
        const text = await res.text().catch(() => "")
        alert(text || "Ошибка загрузки: сервер вернул не-JSON ответ")
        return
      }

      const json = await res.json()
      if (!json?.success) {
        alert(json?.error || "Ошибка загрузки")
        return
      }

      onChangeForm({ image_url: json.publicUrl })
    } finally {
      setUploadingImage(false)
    }
  }

  /** Файл выбран — открываем диалог кропа */
  const handleFileSelected = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result as string)
      setCropDialogOpen(true)
    }
    reader.readAsDataURL(file)
  }

  /** Кроп завершён — загружаем на сервер */
  const handleCropDone = (blob: Blob) => {
    setCropDialogOpen(false)
    setCropImageSrc(null)
    void handleUploadImage(blob)
  }

  const renderForm = (title: string) => (
    <Card className="rounded-2xl border-primary/30 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Заголовок (H1)</Label>
            <Input
              value={newsFormData.title || ""}
              onChange={(e) => onChangeForm({ title: e.target.value })}
              placeholder="Заголовок статьи"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>URL (slug)</Label>
            <Input
              value={newsFormData.slug || ""}
              onChange={(e) => onChangeForm({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })}
              placeholder="oformlenie-uchastka"
              className="rounded-xl font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Латиница, будет использован в URL: /blog/{newsFormData.slug || "slug"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SEO Title</Label>
            <Input
              value={newsFormData.meta_title || ""}
              onChange={(e) => onChangeForm({ meta_title: e.target.value })}
              placeholder="Заголовок для поисковиков (если отличается)"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Автор</Label>
            <Input
              value={newsFormData.author || ""}
              onChange={(e) => onChangeForm({ author: e.target.value })}
              placeholder="Имя автора"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>SEO описание (meta description)</Label>
          <Input
            value={newsFormData.meta_description || ""}
            onChange={(e) => onChangeForm({ meta_description: e.target.value })}
            placeholder="Краткое описание для поисковиков (до 160 символов)"
            className="rounded-xl"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{(newsFormData.meta_description || "").length}/160 символов</p>
        </div>

        <div className="space-y-2">
          <Label>URL изображения</Label>
          <div className="flex gap-2">
            <Input
              value={newsFormData.image_url || ""}
              onChange={(e) => onChangeForm({ image_url: e.target.value })}
              placeholder="https://..."
              className="rounded-xl"
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingImage || loading}
              onClick={() => {
                const el = document.getElementById("news-image-upload") as HTMLInputElement | null
                el?.click()
              }}
              className="rounded-xl bg-transparent"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <input
              id="news-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ""
                if (!f) return
                handleFileSelected(f)
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Рекомендуемый размер: 1200×675 px (формат 16:9). Картинка заполнит всю плашку. Допустимые форматы: JPG, PNG, WebP.</p>
          {newsFormData.image_url && (
            <div className="mt-2 rounded-xl overflow-hidden border">
              <img src={newsFormData.image_url} alt="Preview" className="w-full h-40 object-cover" />
            </div>
          )}
        </div>

        {/* Диалог обрезки изображения */}
        {cropImageSrc && (
          <ImageCropDialog
            open={cropDialogOpen}
            imageSrc={cropImageSrc}
            aspect={16 / 9}
            onClose={() => { setCropDialogOpen(false); setCropImageSrc(null) }}
            onCropDone={handleCropDone}
          />
        )}

        <div className="space-y-2">
          <Label>Содержание статьи</Label>
          <RichTextEditor
            content={newsFormData.content || ""}
            onChange={(html) => onChangeForm({ content: html })}
            placeholder="Начните писать статью..."
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-green-100 rounded-xl">
          <span className="text-sm font-medium">Опубликовать</span>
          <Switch
            checked={newsFormData.is_published || false}
            onCheckedChange={(checked) => onChangeForm({ is_published: checked })}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={onSave} disabled={loading} className="flex-1 rounded-xl">
            {loading ? "Сохранение..." : "Сохранить"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="rounded-xl bg-transparent">
            Отмена
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Блог / Статьи</h2>
        <Button onClick={onCreate} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Добавить статью
        </Button>
      </div>

      {/* Parser Widget */}
      <NewsParserWidget onNewsDraftsAdded={onRefresh} />

      {/* New news form — at the top */}
      {isCreatingNews && renderForm("Новая статья")}

      {/* News List */}
      <div className="space-y-4">
        {news.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Статей пока нет. Добавьте первую!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {news.map((newsItem) => (
              <div key={newsItem.id} className="space-y-4">
                <Card className="rounded-2xl overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-48 h-32 bg-secondary flex-shrink-0">
                      {newsItem.image_url ? (
                        <img src={newsItem.image_url} alt={newsItem.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Newspaper className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="flex-1 p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{newsItem.title || "Без названия"}</h3>
                            {!newsItem.is_published && <Badge variant="secondary">Черновик</Badge>}
                          </div>
                          {newsItem.slug && <p className="text-xs font-mono text-primary/70">/blog/{newsItem.slug}</p>}
                          <p className="text-sm text-muted-foreground">Автор: {newsItem.author || "Не указан"} · {formatDate(newsItem.created_at)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => onEdit(newsItem)} className="rounded-lg">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(newsItem.id)}
                            className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>

                {/* Inline editor — right below the edited news item */}
                {editingNews?.id === newsItem.id && renderForm("Редактирование")}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NewsTab

