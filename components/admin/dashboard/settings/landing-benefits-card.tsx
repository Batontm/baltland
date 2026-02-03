import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Upload } from "lucide-react"
import type { LandingBenefitItem, LandingBenefitsSection } from "@/lib/types"

type UploadResult = { publicUrl: string; storagePath: string } | null

interface LandingBenefitsCardProps {
  section: LandingBenefitsSection | null
  items: LandingBenefitItem[]
  loading: boolean
  saving: boolean
  uploadingImage: boolean
  lucideOptions: readonly string[]
  onChangeSection: (next: LandingBenefitsSection) => void
  onChangeItems: (next: LandingBenefitItem[]) => void
  onUploadImage: (file: File, folder: string) => Promise<UploadResult>
  onSave: () => void
  onPreview: (url: string) => void
}

export function LandingBenefitsCard({
  section,
  items,
  loading,
  saving,
  uploadingImage,
  lucideOptions,
  onChangeSection,
  onChangeItems,
  onUploadImage,
  onSave,
  onPreview,
}: LandingBenefitsCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Блок «Почему выбирают наши участки»</CardTitle>
        <CardDescription>
          Управление заголовком, 2 большими карточками (картинка + текст + кнопка) и 6 центральными карточками
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!section ? (
          <div className="text-sm text-muted-foreground">{loading ? "Загрузка..." : "Не удалось загрузить данные блока"}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Заголовок</Label>
                <Input
                  value={section.title || ""}
                  onChange={(e) =>
                    onChangeSection({
                      ...section,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Подзаголовок</Label>
                <Input
                  value={section.subtitle || ""}
                  onChange={(e) =>
                    onChangeSection({
                      ...section,
                      subtitle: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border rounded-xl p-4 space-y-3">
                <div className="font-medium">Левая большая карточка</div>

                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="w-28 h-20 rounded-lg overflow-hidden border bg-muted"
                    onClick={() => section.left_image_url && onPreview(section.left_image_url)}
                  >
                    {section.left_image_url ? (
                      <img src={section.left_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </button>

                  <div className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      onClick={() => {
                        const el = document.getElementById("landing-benefits-left-image") as HTMLInputElement | null
                        el?.click()
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Загрузить
                    </Button>
                    <input
                      id="landing-benefits-left-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ""
                        if (!f) return
                        const uploaded = await onUploadImage(f, "left")
                        if (!uploaded) return
                        onChangeSection({
                          ...section,
                          left_image_url: uploaded.publicUrl,
                        })
                      }}
                    />
                    <div className="text-xs text-muted-foreground mt-2">jpeg/png/webp. Можно внешнюю ссылку тоже.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label>Заголовок</Label>
                    <Input
                      value={section.left_title || ""}
                      onChange={(e) =>
                        onChangeSection({
                          ...section,
                          left_title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Описание</Label>
                    <Input
                      value={section.left_description || ""}
                      onChange={(e) =>
                        onChangeSection({
                          ...section,
                          left_description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Текст кнопки</Label>
                      <Input
                        value={section.left_button_text || ""}
                        onChange={(e) =>
                          onChangeSection({
                            ...section,
                            left_button_text: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>URL кнопки</Label>
                      <Input
                        value={section.left_button_url || ""}
                        onChange={(e) =>
                          onChangeSection({
                            ...section,
                            left_button_url: e.target.value,
                          })
                        }
                        placeholder="#catalog или https://..."
                      />
                      <div className="text-xs text-muted-foreground">Поддерживаются якоря и внешние ссылки https://...</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-xl p-4 space-y-3">
                <div className="font-medium">Правая большая карточка</div>

                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="w-28 h-20 rounded-lg overflow-hidden border bg-muted"
                    onClick={() => section.right_image_url && onPreview(section.right_image_url)}
                  >
                    {section.right_image_url ? (
                      <img src={section.right_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </button>

                  <div className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      onClick={() => {
                        const el = document.getElementById("landing-benefits-right-image") as HTMLInputElement | null
                        el?.click()
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Загрузить
                    </Button>
                    <input
                      id="landing-benefits-right-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ""
                        if (!f) return
                        const uploaded = await onUploadImage(f, "right")
                        if (!uploaded) return
                        onChangeSection({
                          ...section,
                          right_image_url: uploaded.publicUrl,
                        })
                      }}
                    />
                    <div className="text-xs text-muted-foreground mt-2">jpeg/png/webp. Можно внешнюю ссылку тоже.</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label>Заголовок</Label>
                    <Input
                      value={section.right_title || ""}
                      onChange={(e) =>
                        onChangeSection({
                          ...section,
                          right_title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Описание</Label>
                    <Input
                      value={section.right_description || ""}
                      onChange={(e) =>
                        onChangeSection({
                          ...section,
                          right_description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Текст кнопки</Label>
                      <Input
                        value={section.right_button_text || ""}
                        onChange={(e) =>
                          onChangeSection({
                            ...section,
                            right_button_text: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>URL кнопки</Label>
                      <Input
                        value={section.right_button_url || ""}
                        onChange={(e) =>
                          onChangeSection({
                            ...section,
                            right_button_url: e.target.value,
                          })
                        }
                        placeholder="#about или https://..."
                      />
                      <div className="text-xs text-muted-foreground">Поддерживаются якоря и внешние ссылки https://...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Центральные карточки (6)</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextSort = (items?.length || 0) + 1
                      onChangeItems([
                        ...items,
                        {
                          id: crypto.randomUUID(),
                          section_id: section.id,
                          title: "",
                          description: "",
                          icon_type: "lucide",
                          icon_name: "TreePine",
                          icon_url: null,
                          color_class: "bg-primary/10 text-primary",
                          sort_order: nextSort,
                          is_active: true,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        },
                      ])
                    }}
                    disabled={(items?.length || 0) >= 6}
                  >
                    Добавить
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(items || []).slice(0, 6).map((item, idx) => (
                  <div key={item.id} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">Карточка {idx + 1}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => onChangeItems(items.filter((x) => x.id !== item.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label>Заголовок</Label>
                        <Input
                          value={item.title || ""}
                          onChange={(e) => {
                            const next = [...items]
                            next[idx] = { ...next[idx], title: e.target.value }
                            onChangeItems(next)
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Описание</Label>
                        <Input
                          value={item.description || ""}
                          onChange={(e) => {
                            const next = [...items]
                            next[idx] = { ...next[idx], description: e.target.value }
                            onChangeItems(next)
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label>Тип иконки</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                          value={item.icon_type}
                          onChange={(e) => {
                            const next = [...items]
                            const iconType = e.target.value as "lucide" | "image"
                            next[idx] = {
                              ...next[idx],
                              icon_type: iconType,
                              icon_name: iconType === "lucide" ? (next[idx].icon_name || "TreePine") : null,
                              icon_url: iconType === "image" ? next[idx].icon_url : null,
                            }
                            onChangeItems(next)
                          }}
                        >
                          <option value="lucide">Lucide</option>
                          <option value="image">Картинка</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Цвет (Tailwind)</Label>
                        <Input
                          value={item.color_class || ""}
                          onChange={(e) => {
                            const next = [...items]
                            next[idx] = { ...next[idx], color_class: e.target.value }
                            onChangeItems(next)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Порядок</Label>
                        <Input
                          type="number"
                          value={String(item.sort_order ?? idx + 1)}
                          onChange={(e) => {
                            const next = [...items]
                            next[idx] = { ...next[idx], sort_order: Number(e.target.value) || idx + 1 }
                            onChangeItems(next)
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      {item.icon_type === "lucide" ? (
                        <div className="space-y-2">
                          <Label>Lucide icon</Label>
                          <select
                            className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                            value={item.icon_name || "TreePine"}
                            onChange={(e) => {
                              const next = [...items]
                              next[idx] = { ...next[idx], icon_name: e.target.value }
                              onChangeItems(next)
                            }}
                          >
                            {lucideOptions.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Иконка-картинка</Label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="w-12 h-12 rounded-lg overflow-hidden border bg-muted"
                              onClick={() => item.icon_url && onPreview(item.icon_url)}
                            >
                              {item.icon_url ? (
                                <img src={item.icon_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full" />
                              )}
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={uploadingImage}
                              onClick={() => {
                                const el = document.getElementById(`landing-benefits-icon-${item.id}`) as
                                  | HTMLInputElement
                                  | null
                                el?.click()
                              }}
                            >
                              <Upload className="h-4 w-4" />
                              Загрузить
                            </Button>
                            <input
                              id={`landing-benefits-icon-${item.id}`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0]
                                e.target.value = ""
                                if (!f) return
                                const uploaded = await onUploadImage(f, "icons")
                                if (!uploaded) return
                                const next = [...items]
                                next[idx] = { ...next[idx], icon_url: uploaded.publicUrl }
                                onChangeItems(next)
                              }}
                            />
                            <Input
                              value={item.icon_url || ""}
                              onChange={(e) => {
                                const next = [...items]
                                next[idx] = { ...next[idx], icon_url: e.target.value }
                                onChangeItems(next)
                              }}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={onSave} disabled={saving || uploadingImage}>
                {saving ? "Сохранение..." : "Сохранить блок"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
