"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    GripVertical,
    Eye,
    Save,
    Loader2,
    Type,
    Palette,
    Layout,
    Image,
    FileText,
    Upload,
    ExternalLink,
    Phone
} from "lucide-react"
import type { OrganizationSettings } from "@/lib/types"

interface ProposalTemplateEditorProps {
    settings: OrganizationSettings
    loading: boolean
    saving: boolean
    onChange: (patch: Partial<OrganizationSettings>) => void
    onSave: () => void
    onPreview: () => void
    onUploadFont?: (file: File) => Promise<string | null>
}

// Default block order
const DEFAULT_BLOCKS = ["header", "plots", "footer"]

// Available blocks for drag-drop
const AVAILABLE_BLOCKS = [
    { id: "header", label: "Шапка (логотип + контакты)", icon: Layout },
    { id: "description", label: "Описание", icon: FileText },
    { id: "plots", label: "Участки", icon: Image },
    { id: "footer", label: "Футер", icon: FileText },
]

const FONT_OPTIONS = [
    { value: "Arial", label: "Arial" },
    { value: "Roboto", label: "Roboto" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Georgia", label: "Georgia" },
    { value: "Verdana", label: "Verdana" },
    { value: "custom", label: "Свой шрифт" },
]

const LOGO_SIZE_OPTIONS = [
    { value: "small", label: "Маленький (32px)" },
    { value: "medium", label: "Средний (48px)" },
    { value: "large", label: "Большой (64px)" },
]

const CONTACTS_POSITION_OPTIONS = [
    { value: "right", label: "Справа от логотипа" },
    { value: "below-logo", label: "Под логотипом" },
    { value: "footer-only", label: "Только в футере" },
]

export function ProposalTemplateEditor({
    settings,
    loading,
    saving,
    onChange,
    onSave,
    onPreview,
    onUploadFont,
}: ProposalTemplateEditorProps) {
    const [draggedBlock, setDraggedBlock] = useState<string | null>(null)
    const [uploadingFont, setUploadingFont] = useState(false)

    const blocksOrder = settings.proposal_blocks_order || DEFAULT_BLOCKS

    const handleDragStart = (blockId: string) => {
        setDraggedBlock(blockId)
    }

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        if (!draggedBlock || draggedBlock === targetId) return
    }

    const handleDrop = (targetId: string) => {
        if (!draggedBlock || draggedBlock === targetId) return

        const newOrder = [...blocksOrder]
        const draggedIndex = newOrder.indexOf(draggedBlock)
        const targetIndex = newOrder.indexOf(targetId)

        if (draggedIndex !== -1 && targetIndex !== -1) {
            newOrder.splice(draggedIndex, 1)
            newOrder.splice(targetIndex, 0, draggedBlock)
            onChange({ proposal_blocks_order: newOrder })
        }

        setDraggedBlock(null)
    }

    const handleFontUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !onUploadFont) return

        setUploadingFont(true)
        try {
            const url = await onUploadFont(file)
            if (url) {
                onChange({ proposal_custom_font_url: url, proposal_font_family: "custom" })
            }
        } finally {
            setUploadingFont(false)
            e.target.value = ""
        }
    }, [onUploadFont, onChange])

    if (loading) {
        return (
            <Card className="rounded-2xl">
                <CardContent className="p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Загрузка настроек...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Редактор шаблона КП</h2>
                    <p className="text-muted-foreground">Настройте внешний вид коммерческого предложения</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onPreview}>
                        <Eye className="h-4 w-4 mr-2" />
                        Предпросмотр
                    </Button>
                    <Button onClick={onSave} disabled={saving}>
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Сохранить
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="layout" className="space-y-4">
                <TabsList className="grid grid-cols-5 w-full max-w-xl">
                    <TabsTrigger value="layout" className="gap-2">
                        <Layout className="h-4 w-4" />
                        Блоки
                    </TabsTrigger>
                    <TabsTrigger value="contacts" className="gap-2">
                        <Phone className="h-4 w-4" />
                        Контакты
                    </TabsTrigger>
                    <TabsTrigger value="colors" className="gap-2">
                        <Palette className="h-4 w-4" />
                        Цвета
                    </TabsTrigger>
                    <TabsTrigger value="fonts" className="gap-2">
                        <Type className="h-4 w-4" />
                        Шрифты
                    </TabsTrigger>
                    <TabsTrigger value="header" className="gap-2">
                        <Image className="h-4 w-4" />
                        Шапка
                    </TabsTrigger>
                </TabsList>

                {/* Layout Tab - Drag & Drop */}
                <TabsContent value="layout">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Порядок блоков</CardTitle>
                            <CardDescription>Перетащите блоки для изменения порядка</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {blocksOrder.map((blockId) => {
                                const block = AVAILABLE_BLOCKS.find((b) => b.id === blockId)
                                if (!block) return null
                                const Icon = block.icon

                                return (
                                    <div
                                        key={blockId}
                                        draggable
                                        onDragStart={() => handleDragStart(blockId)}
                                        onDragOver={(e) => handleDragOver(e, blockId)}
                                        onDrop={() => handleDrop(blockId)}
                                        className={`
                      flex items-center gap-3 p-4 rounded-lg border bg-card cursor-grab
                      hover:border-emerald-300 transition-colors
                      ${draggedBlock === blockId ? "opacity-50 border-emerald-500" : ""}
                    `}
                                    >
                                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                                        <Icon className="h-5 w-5 text-emerald-600" />
                                        <span className="flex-1 font-medium">{block.label}</span>
                                        <Badge variant="outline">{blocksOrder.indexOf(blockId) + 1}</Badge>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Contacts Tab */}
                <TabsContent value="contacts">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Контактная информация в КП</CardTitle>
                            <CardDescription>Укажите данные, которые будут отображаться в коммерческом предложении</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Название организации</Label>
                                <Input
                                    value={settings.organization_name || ""}
                                    onChange={(e) => onChange({ organization_name: e.target.value })}
                                    placeholder="БалтикЗемля"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Телефон</Label>
                                    <Input
                                        value={settings.phone || ""}
                                        onChange={(e) => onChange({ phone: e.target.value })}
                                        placeholder="+7 (999) 123-45-67"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={settings.email || ""}
                                        onChange={(e) => onChange({ email: e.target.value })}
                                        placeholder="info@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Адрес</Label>
                                <Input
                                    value={settings.address || ""}
                                    onChange={(e) => onChange({ address: e.target.value })}
                                    placeholder="г. Калининград, ул. Примерная, 1"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Рабочие часы</Label>
                                <Input
                                    value={settings.working_hours || ""}
                                    onChange={(e) => onChange({ working_hours: e.target.value })}
                                    placeholder="Пн-Пт: 9:00-18:00"
                                />
                            </div>

                            {/* Preview */}
                            <div className="mt-4 p-4 rounded-lg border bg-slate-50">
                                <p className="text-sm text-muted-foreground mb-2">Предпросмотр в КП:</p>
                                <div className="text-sm space-y-1">
                                    <p className="font-semibold">{settings.organization_name || "Название организации"}</p>
                                    <p>{settings.phone || "+7 (999) 123-45-67"}</p>
                                    <p>{settings.email || "info@example.com"}</p>
                                    <p className="text-muted-foreground">{settings.address || "Адрес"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Colors Tab */}
                <TabsContent value="colors">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Цветовая схема</CardTitle>
                            <CardDescription>Настройте цвета документа</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Основной цвет текста</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={settings.proposal_primary_color || "#000000"}
                                            onChange={(e) => onChange({ proposal_primary_color: e.target.value })}
                                            className="w-12 h-10 p-1"
                                        />
                                        <Input
                                            type="text"
                                            value={settings.proposal_primary_color || "#000000"}
                                            onChange={(e) => onChange({ proposal_primary_color: e.target.value })}
                                            className="flex-1"
                                            placeholder="#000000"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Акцентный цвет</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={settings.proposal_accent_color || "#22c55e"}
                                            onChange={(e) => onChange({ proposal_accent_color: e.target.value })}
                                            className="w-12 h-10 p-1"
                                        />
                                        <Input
                                            type="text"
                                            value={settings.proposal_accent_color || "#22c55e"}
                                            onChange={(e) => onChange({ proposal_accent_color: e.target.value })}
                                            className="flex-1"
                                            placeholder="#22c55e"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Фон шапки</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={settings.proposal_header_bg_color || "#ffffff"}
                                            onChange={(e) => onChange({ proposal_header_bg_color: e.target.value })}
                                            className="w-12 h-10 p-1"
                                        />
                                        <Input
                                            type="text"
                                            value={settings.proposal_header_bg_color || "#ffffff"}
                                            onChange={(e) => onChange({ proposal_header_bg_color: e.target.value })}
                                            className="flex-1"
                                            placeholder="#ffffff"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Color preview */}
                            <div className="p-4 rounded-lg border mt-4" style={{ backgroundColor: settings.proposal_header_bg_color || "#fff" }}>
                                <span style={{ color: settings.proposal_primary_color || "#000" }}>
                                    Примерный текст заголовка
                                </span>
                                <span className="ml-2" style={{ color: settings.proposal_accent_color || "#22c55e" }}>
                                    • Акцент
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Fonts Tab */}
                <TabsContent value="fonts">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Шрифты</CardTitle>
                            <CardDescription>Выберите шрифт или загрузите свой</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Семейство шрифта</Label>
                                    <Select
                                        value={settings.proposal_font_family || "Arial"}
                                        onValueChange={(v) => onChange({ proposal_font_family: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FONT_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {settings.proposal_font_family === "custom" && (
                                    <div className="space-y-2">
                                        <Label>Загрузить шрифт (.woff, .woff2, .ttf)</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => document.getElementById("font-upload")?.click()}
                                                disabled={uploadingFont}
                                            >
                                                {uploadingFont ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Upload className="h-4 w-4 mr-2" />
                                                )}
                                                Загрузить
                                            </Button>
                                            <input
                                                id="font-upload"
                                                type="file"
                                                accept=".woff,.woff2,.ttf,.otf"
                                                className="hidden"
                                                onChange={handleFontUpload}
                                            />
                                            {settings.proposal_custom_font_url && (
                                                <Button variant="ghost" size="icon" asChild>
                                                    <a href={settings.proposal_custom_font_url} target="_blank" rel="noopener">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Размер заголовков (px)</Label>
                                    <Input
                                        type="number"
                                        min={16}
                                        max={48}
                                        value={settings.proposal_header_font_size || 28}
                                        onChange={(e) => onChange({ proposal_header_font_size: parseInt(e.target.value) || 28 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Размер текста (px)</Label>
                                    <Input
                                        type="number"
                                        min={10}
                                        max={24}
                                        value={settings.proposal_body_font_size || 14}
                                        onChange={(e) => onChange({ proposal_body_font_size: parseInt(e.target.value) || 14 })}
                                    />
                                </div>
                            </div>

                            {/* Font preview */}
                            <div
                                className="p-4 rounded-lg border mt-4"
                                style={{ fontFamily: settings.proposal_font_family === "custom" ? "CustomProposalFont" : settings.proposal_font_family || "Arial" }}
                            >
                                <p style={{ fontSize: settings.proposal_header_font_size || 28 }}>Заголовок документа</p>
                                <p style={{ fontSize: settings.proposal_body_font_size || 14 }} className="mt-2 text-muted-foreground">
                                    Обычный текст документа выглядит так
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Header Tab */}
                <TabsContent value="header">
                    <Card className="rounded-2xl">
                        <CardHeader>
                            <CardTitle>Шапка документа</CardTitle>
                            <CardDescription>Настройте отображение логотипа и контактов</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Logo settings */}
                            <div className="space-y-4">
                                <h4 className="font-medium">Логотип</h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Показывать логотип</Label>
                                        <Switch
                                            checked={settings.proposal_show_logo ?? true}
                                            onCheckedChange={(v) => onChange({ proposal_show_logo: v })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Размер логотипа</Label>
                                        <Select
                                            value={settings.proposal_logo_size || "medium"}
                                            onValueChange={(v) => onChange({ proposal_logo_size: v as "small" | "medium" | "large" })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {LOGO_SIZE_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Показывать название организации</Label>
                                    <Switch
                                        checked={settings.proposal_show_org_name ?? true}
                                        onCheckedChange={(v) => onChange({ proposal_show_org_name: v })}
                                    />
                                </div>
                            </div>

                            {/* Contacts settings */}
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-medium">Контактная информация</h4>
                                <div className="space-y-2">
                                    <Label>Расположение контактов</Label>
                                    <Select
                                        value={settings.proposal_contacts_position || "right"}
                                        onValueChange={(v) => onChange({ proposal_contacts_position: v as "right" | "below-logo" | "footer-only" })}
                                    >
                                        <SelectTrigger className="w-full md:w-64">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CONTACTS_POSITION_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Телефон</Label>
                                        <Switch
                                            checked={settings.proposal_header_show_phone ?? true}
                                            onCheckedChange={(v) => onChange({ proposal_header_show_phone: v })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Email</Label>
                                        <Switch
                                            checked={settings.proposal_header_show_email ?? true}
                                            onCheckedChange={(v) => onChange({ proposal_header_show_email: v })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Адрес</Label>
                                        <Switch
                                            checked={settings.proposal_header_show_address ?? true}
                                            onCheckedChange={(v) => onChange({ proposal_header_show_address: v })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer settings */}
                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="font-medium">Футер</h4>
                                <div className="flex items-center justify-between">
                                    <Label>Показывать футер</Label>
                                    <Switch
                                        checked={settings.proposal_show_footer ?? true}
                                        onCheckedChange={(v) => onChange({ proposal_show_footer: v })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Текст футера</Label>
                                    <Textarea
                                        value={settings.proposal_footer_text || ""}
                                        onChange={(e) => onChange({ proposal_footer_text: e.target.value })}
                                        placeholder="Коммерческое предложение действительно на момент формирования"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
