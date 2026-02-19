"use client"

import { useState, useCallback } from "react"
import Cropper, { type Area } from "react-easy-crop"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ZoomIn, ZoomOut, RotateCw, Check, X } from "lucide-react"

interface ImageCropDialogProps {
    open: boolean
    imageSrc: string
    aspect?: number
    onClose: () => void
    onCropDone: (croppedBlob: Blob) => void
}

/** Вырезает кропнутую область из изображения и возвращает Blob. */
async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
): Promise<Blob> {
    const img = new Image()
    img.crossOrigin = "anonymous"
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = imageSrc
    })

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!

    const radians = (rotation * Math.PI) / 180

    // Вычисляем размер холста с учётом поворота
    const sin = Math.abs(Math.sin(radians))
    const cos = Math.abs(Math.cos(radians))
    const bBoxWidth = img.width * cos + img.height * sin
    const bBoxHeight = img.width * sin + img.height * cos

    canvas.width = bBoxWidth
    canvas.height = bBoxHeight

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(radians)
    ctx.translate(-img.width / 2, -img.height / 2)
    ctx.drawImage(img, 0, 0)

    // Создаём финальный холст с кропом
    const croppedCanvas = document.createElement("canvas")
    const croppedCtx = croppedCanvas.getContext("2d")!

    croppedCanvas.width = pixelCrop.width
    croppedCanvas.height = pixelCrop.height

    croppedCtx.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
    )

    return new Promise<Blob>((resolve, reject) => {
        croppedCanvas.toBlob(
            (blob) => {
                if (blob) resolve(blob)
                else reject(new Error("Canvas toBlob failed"))
            },
            "image/webp",
            0.9,
        )
    })
}

export function ImageCropDialog({
    open,
    imageSrc,
    aspect = 16 / 9,
    onClose,
    onCropDone,
}: ImageCropDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [processing, setProcessing] = useState(false)

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels)
    }, [])

    const handleApply = async () => {
        if (!croppedAreaPixels) return
        setProcessing(true)
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
            onCropDone(blob)
        } catch (err) {
            console.error("Crop error:", err)
            alert("Ошибка при обрезке изображения")
        } finally {
            setProcessing(false)
        }
    }

    const handleReset = () => {
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setRotation(0)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-3">
                    <DialogTitle>Обрезка изображения</DialogTitle>
                </DialogHeader>

                {/* Область кропа */}
                <div className="relative w-full bg-black/90" style={{ height: 400 }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        cropShape="rect"
                        showGrid
                        style={{
                            containerStyle: { borderRadius: 0 },
                            cropAreaStyle: {
                                border: "2px solid rgba(255,255,255,0.8)",
                                borderRadius: "8px",
                            },
                        }}
                    />
                </div>

                {/* Управление */}
                <div className="px-6 py-4 space-y-4 bg-background">
                    {/* Zoom */}
                    <div className="flex items-center gap-3">
                        <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.05}
                            onValueChange={([v]) => setZoom(v)}
                            className="flex-1"
                        />
                        <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                            {Math.round(zoom * 100)}%
                        </span>
                    </div>

                    {/* Rotate */}
                    <div className="flex items-center gap-3">
                        <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Slider
                            value={[rotation]}
                            min={0}
                            max={360}
                            step={1}
                            onValueChange={([v]) => setRotation(v)}
                            className="flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                            {rotation}°
                        </span>
                    </div>
                </div>

                <DialogFooter className="px-6 pb-6 pt-2 gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="mr-auto"
                    >
                        Сбросить
                    </Button>
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        <X className="h-4 w-4 mr-1" />
                        Отмена
                    </Button>
                    <Button onClick={handleApply} disabled={processing || !croppedAreaPixels}>
                        {processing ? (
                            "Обработка..."
                        ) : (
                            <>
                                <Check className="h-4 w-4 mr-1" />
                                Применить
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
