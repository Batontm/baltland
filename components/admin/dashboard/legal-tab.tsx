"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    GripVertical,
    Upload,
    FileText,
    Image as ImageIcon,
    Check,
    X,
    ExternalLink,
} from "lucide-react"
import { type LegalContent } from "@/lib/types"

interface LegalTabProps {
    items: LegalContent[]
    onCreate: (data: Partial<LegalContent>) => Promise<any>
    onUpdate: (id: string, data: Partial<LegalContent>) => Promise<any>
    onDelete: (id: string) => Promise<any>
}

export function LegalTab({ items, onCreate, onUpdate, onDelete }: LegalTabProps) {
    const [localItems, setLocalItems] = useState<LegalContent[]>(items)
    const [isEditing, setIsEditing] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [editingItem, setEditingItem] = useState<Partial<LegalContent> | null>(null)
    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadingPdf, setUploadingPdf] = useState(false)

    useEffect(() => {
        setLocalItems(items)
    }, [items])

    const handleCreate = () => {
        setEditingItem({
            title: "",
            content: "",
            is_active: true,
            sort_order: items.length,
        })
        setIsCreating(true)
        setIsEditing(false)
    }

    const handleEdit = (item: LegalContent) => {
        setEditingItem(item)
        setIsEditing(true)
        setIsCreating(false)
    }

    const handleCancel = () => {
        setEditingItem(null)
        setIsEditing(false)
        setIsCreating(false)
    }

    const handleSave = async () => {
        if (!editingItem?.title || !editingItem?.content) {
            alert("Заголовок и содержание обязательны")
            return
        }

        setLoading(true)
        try {
            if (isCreating) {
                await onCreate(editingItem)
            } else if (editingItem.id) {
                await onUpdate(editingItem.id, editingItem)
            }
            handleCancel()
        } catch (error) {
            console.error("Error saving legal content:", error)
            alert("Ошибка при сохранении")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Вы уверены, что хотите удалить этот раздел?")) return
        setLoading(true)
        try {
            await onDelete(id)
        } catch (error) {
            console.error("Error deleting legal content:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: "image" | "pdf") => {
        const file = event.target.files?.[0]
        if (!file) return

        if (type === "image" && !file.type.startsWith("image/")) {
            alert("Пожалуйста, выберите изображение")
            return
        }

        if (type === "pdf" && file.type !== "application/pdf") {
            alert("Пожалуйста, выберите PDF файл")
            return
        }

        const loader = type === "image" ? setUploadingImage : setUploadingPdf
        loader(true)

        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("type", type)

            // We'll use a generic upload API if available, otherwise we'll need to create one
            // For now, let's assume there's a generic one at /api/admin/upload
            const response = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
            })

            const result = await response.json()
            if (result.success) {
                setEditingItem(prev => ({
                    ...prev,
                    [type === "image" ? "image_url" : "pdf_url"]: result.url
                }))
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            console.error("Upload error:", error)
            alert(`Ошибка загрузки: ${error.message || "Неизвестная ошибка"}`)
        } finally {
            loader(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Юридическая чистота</h2>
                    <p className="text-muted-foreground">Управление контентом для раздела обучения и легальности</p>
                </div>
                <Button onClick={handleCreate} disabled={loading}>
                    <Plus className="mr-2 h-4 w-4" /> Добавить раздел
                </Button>
            </div>

            {(isCreating || isEditing) && editingItem && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle>{isCreating ? "Новый раздел" : "Редактирование раздела"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Заголовок</label>
                            <Input
                                value={editingItem.title}
                                onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                placeholder="Например: Проверка документов"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Содержание (Markdown)</label>
                            <Textarea
                                value={editingItem.content}
                                onChange={e => setEditingItem({ ...editingItem, content: e.target.value })}
                                placeholder="Текст раздела..."
                                rows={8}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Изображение</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative h-24 w-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-white overflow-hidden">
                                        {editingItem.image_url ? (
                                            <>
                                                <img src={editingItem.image_url} alt="Preview" className="h-full w-full object-cover" />
                                                <button
                                                    onClick={() => setEditingItem({ ...editingItem, image_url: null })}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-muted-foreground opacity-20" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            value={editingItem.image_url || ""}
                                            onChange={e => setEditingItem({ ...editingItem, image_url: e.target.value })}
                                            placeholder="URL изображения..."
                                        />
                                        <div className="relative">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="image-upload"
                                                onChange={e => handleFileUpload(e, "image")}
                                                disabled={uploadingImage}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                asChild
                                                disabled={uploadingImage}
                                            >
                                                <label htmlFor="image-upload" className="cursor-pointer">
                                                    {uploadingImage ? "Загрузка..." : <><Upload className="mr-2 h-4 w-4" /> Загрузить файл</>}
                                                </label>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">PDF Файл</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-white">
                                        {editingItem.pdf_url ? (
                                            <div className="text-center">
                                                <FileText className="h-8 w-8 text-primary mx-auto" />
                                                <span className="text-[10px] block mt-1">PDF готов</span>
                                                <button
                                                    onClick={() => setEditingItem({ ...editingItem, pdf_url: null })}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <FileText className="h-8 w-8 text-muted-foreground opacity-20" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            value={editingItem.pdf_url || ""}
                                            onChange={e => setEditingItem({ ...editingItem, pdf_url: e.target.value })}
                                            placeholder="URL PDF файла..."
                                        />
                                        <div className="relative">
                                            <Input
                                                type="file"
                                                accept="application/pdf"
                                                className="hidden"
                                                id="pdf-upload"
                                                onChange={e => handleFileUpload(e, "pdf")}
                                                disabled={uploadingPdf}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                asChild
                                                disabled={uploadingPdf}
                                            >
                                                <label htmlFor="pdf-upload" className="cursor-pointer">
                                                    {uploadingPdf ? "Загрузка..." : <><Upload className="mr-2 h-4 w-4" /> Загрузить PDF</>}
                                                </label>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editingItem.is_active}
                                    onChange={e => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                Опубликовано
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={handleCancel} disabled={loading}>
                                Отмена
                            </Button>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? "Сохранение..." : "Сохранить"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4">
                {localItems.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                            <p className="text-muted-foreground">Разделы еще не созданы</p>
                            <Button variant="link" onClick={handleCreate}>Добавить первый раздел</Button>
                        </CardContent>
                    </Card>
                ) : (
                    localItems.map((item) => (
                        <Card key={item.id} className={!item.is_active ? "opacity-60 bg-slate-50" : ""}>
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="flex gap-4 items-start">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt="" className="w-20 h-20 rounded-lg object-cover border" />
                                        ) : (
                                            <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center border">
                                                <FileText className="text-muted-foreground opacity-30" />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-bold flex items-center gap-2">
                                                {item.title}
                                                {!item.is_active && <Badge variant="secondary" className="text-[10px] uppercase">Черновик</Badge>}
                                            </h4>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                {item.content}
                                            </p>
                                            <div className="flex gap-4 mt-2">
                                                {item.pdf_url && (
                                                    <a
                                                        href={item.pdf_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                                                    >
                                                        <FileText className="h-3 w-3" /> PDF Документ
                                                    </a>
                                                )}
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    Порядок: {item.sort_order}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                                        <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
