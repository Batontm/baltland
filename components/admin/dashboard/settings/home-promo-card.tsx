"use client"

import { useEffect, useMemo, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { OrganizationSettings } from "@/lib/types"

type PromoKey = "promo1" | "promo2"

const PROMO_ASPECT = 3776 / 2240

async function createImage(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", (error) => reject(error))
    image.setAttribute("crossOrigin", "anonymous")
    image.src = url
  })
}

async function getCroppedBlob(params: {
  imageSrc: string
  crop: Area
  outputType?: "image/png" | "image/webp"
}): Promise<Blob> {
  const image = await createImage(params.imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas context is not available")

  canvas.width = Math.round(params.crop.width)
  canvas.height = Math.round(params.crop.height)

  ctx.drawImage(
    image,
    params.crop.x,
    params.crop.y,
    params.crop.width,
    params.crop.height,
    0,
    0,
    params.crop.width,
    params.crop.height,
  )

  const outputType = params.outputType ?? "image/png"

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"))
          return
        }
        resolve(blob)
      },
      outputType,
      outputType === "image/webp" ? 0.9 : undefined,
    )
  })
}

async function uploadImageToStorage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("type", "home-promo")

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: fd,
  })

  const json = await res.json()
  if (!json?.success) {
    throw new Error(json?.error || "Ошибка загрузки")
  }

  return String(json.url)
}

export function HomePromoCard(props: {
  orgSettings: OrganizationSettings
  loadingSettings: boolean
  onChange: (patch: Partial<OrganizationSettings>) => void
  onSave: (data: Partial<OrganizationSettings>) => void
}) {
  const { orgSettings, loadingSettings, onChange, onSave } = props

  const promo = useMemo(
    () => ({
      promo1: {
        imageUrl: orgSettings.home_promo_1_image_url || "",
        href: orgSettings.home_promo_1_href || "/geodesy",
      },
      promo2: {
        imageUrl: orgSettings.home_promo_2_image_url || "",
        href: orgSettings.home_promo_2_href || "/cadastral-discount",
      },
    }),
    [orgSettings.home_promo_1_image_url, orgSettings.home_promo_1_href, orgSettings.home_promo_2_image_url, orgSettings.home_promo_2_href],
  )

  const [activeKey, setActiveKey] = useState<PromoKey | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("promo.png")
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [savingCrop, setSavingCrop] = useState(false)

  useEffect(() => {
    return () => {
      if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc)
    }
  }, [imageSrc])

  const openCropper = (key: PromoKey, file: File) => {
    if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc)
    setActiveKey(key)
    setImageSrc(URL.createObjectURL(file))
    setFileName(file.name || "promo.png")
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  const closeCropper = () => {
    setActiveKey(null)
    if (imageSrc?.startsWith("blob:")) URL.revokeObjectURL(imageSrc)
    setImageSrc(null)
    setSavingCrop(false)
  }

  const onCropComplete = (_: Area, croppedAreaPixelsValue: Area) => {
    setCroppedAreaPixels(croppedAreaPixelsValue)
  }

  const saveCropped = async () => {
    if (!activeKey || !imageSrc || !croppedAreaPixels) return
    setSavingCrop(true)
    try {
      const blob = await getCroppedBlob({ imageSrc, crop: croppedAreaPixels, outputType: "image/png" })
      const file = new File([blob], fileName.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" })
      const url = await uploadImageToStorage(file)

      if (activeKey === "promo1") {
        onChange({ home_promo_1_image_url: url })
      } else {
        onChange({ home_promo_2_image_url: url })
      }

      closeCropper()
    } catch (e: any) {
      alert(String(e?.message || "Ошибка сохранения"))
      setSavingCrop(false)
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Промо на главной</CardTitle>
        <CardDescription>Две кликабельные плашки с фиксированным кадрированием</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-semibold">Плашка №1</div>
            <div className="space-y-2">
              <Label>Ссылка</Label>
              <Input
                value={promo.promo1.href}
                onChange={(e) => onChange({ home_promo_1_href: e.target.value })}
                placeholder="/geodesy"
              />
            </div>
            <div className="space-y-2">
              <Label>Картинка</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={loadingSettings}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) openCropper("promo1", file)
                  e.currentTarget.value = ""
                }}
              />
              {promo.promo1.imageUrl ? (
                <div className="rounded-2xl overflow-hidden border border-border/50">
                  <img src={promo.promo1.imageUrl} alt="promo1" className="block w-full h-auto" />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Картинка не задана</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold">Плашка №2</div>
            <div className="space-y-2">
              <Label>Ссылка</Label>
              <Input
                value={promo.promo2.href}
                onChange={(e) => onChange({ home_promo_2_href: e.target.value })}
                placeholder="/cadastral-discount"
              />
            </div>
            <div className="space-y-2">
              <Label>Картинка</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={loadingSettings}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) openCropper("promo2", file)
                  e.currentTarget.value = ""
                }}
              />
              {promo.promo2.imageUrl ? (
                <div className="rounded-2xl overflow-hidden border border-border/50">
                  <img src={promo.promo2.imageUrl} alt="promo2" className="block w-full h-auto" />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Картинка не задана</div>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={() =>
            onSave({
              home_promo_1_image_url: orgSettings.home_promo_1_image_url ?? null,
              home_promo_1_href: orgSettings.home_promo_1_href ?? null,
              home_promo_2_image_url: orgSettings.home_promo_2_image_url ?? null,
              home_promo_2_href: orgSettings.home_promo_2_href ?? null,
            })
          }
          disabled={loadingSettings}
          className="rounded-xl"
        >
          {loadingSettings ? "Сохранение..." : "Сохранить промо"}
        </Button>

        <Dialog open={!!activeKey} onOpenChange={(open) => (!open ? closeCropper() : null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Кадрирование</DialogTitle>
              <DialogDescription>
                Рамка соответствует плашке на главной. Подвиньте и масштабируйте изображение.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: String(PROMO_ASPECT) }}>
                {imageSrc ? (
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={PROMO_ASPECT}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Масштаб</Label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCropper} className="rounded-xl" disabled={savingCrop}>
                Отмена
              </Button>
              <Button type="button" onClick={saveCropped} className="rounded-xl" disabled={savingCrop}>
                {savingCrop ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
