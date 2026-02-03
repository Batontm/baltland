import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FaqItem, FAQ_CATEGORIES } from "@/lib/types"
import { Edit, HelpCircle, Plus, Trash2, X, MoveUp, MoveDown } from "lucide-react"
import { useState } from "react"

interface FaqTabProps {
    faqItems: FaqItem[]
    faqFormData: Partial<FaqItem>
    isCreatingFaq: boolean
    editingFaq: FaqItem | null
    loading: boolean
    onCreate: () => void
    onCancel: () => void
    onSave: () => void
    onEdit: (item: FaqItem) => void
    onDelete: (id: string) => void
    onChangeForm: (patch: Partial<FaqItem>) => void
    onReorder?: (items: { id: string; sort_order: number }[]) => void
}

export function FaqTab({
    faqItems,
    faqFormData,
    isCreatingFaq,
    editingFaq,
    loading,
    onCreate,
    onCancel,
    onSave,
    onEdit,
    onDelete,
    onChangeForm,
    onReorder,
}: FaqTabProps) {
    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (!onReorder) return
        const newItems = [...faqItems]
        const targetIndex = direction === 'up' ? index - 1 : index + 1

        if (targetIndex < 0 || targetIndex >= newItems.length) return

        const [movedItem] = newItems.splice(index, 1)
        newItems.splice(targetIndex, 0, movedItem)

        const updates = newItems.map((item, idx) => ({
            id: item.id,
            sort_order: idx
        }))

        onReorder(updates)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Помощь покупателю (FAQ)</h2>
                <Button onClick={onCreate} className="rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить вопрос
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FAQ Form Panel */}
                {(isCreatingFaq || editingFaq) && (
                    <Card className="lg:col-span-1 rounded-2xl h-fit sticky top-24">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{isCreatingFaq ? "Новый вопрос" : "Редактирование"}</CardTitle>
                                <Button variant="ghost" size="icon" onClick={onCancel}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-2">
                                <Label>Категория</Label>
                                <Select
                                    value={faqFormData.category || "general"}
                                    onValueChange={(val) => onChangeForm({ category: val })}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Выберите категорию" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {FAQ_CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Вопрос</Label>
                                <Input
                                    value={faqFormData.question || ""}
                                    onChange={(e) => onChangeForm({ question: e.target.value })}
                                    placeholder="Например: Как подвести свет?"
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Ответ</Label>
                                <Textarea
                                    value={faqFormData.answer || ""}
                                    onChange={(e) => onChangeForm({ answer: e.target.value })}
                                    placeholder="Подробный ответ..."
                                    className="rounded-xl min-h-[150px]"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                                <span className="text-sm font-medium">Активен на сайте</span>
                                <Switch
                                    checked={faqFormData.is_active ?? true}
                                    onCheckedChange={(checked) => onChangeForm({ is_active: checked })}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={onSave} disabled={loading} className="flex-1 rounded-xl">
                                    {loading ? "Сохранение..." : "Сохранить"}
                                </Button>
                                <Button variant="outline" onClick={onCancel} className="rounded-xl bg-transparent">
                                    Отмена
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* FAQ List */}
                <div className={`space-y-4 ${isCreatingFaq || editingFaq ? "lg:col-span-2" : "lg:col-span-3"}`}>
                    {faqItems.length === 0 ? (
                        <Card className="rounded-2xl border-dashed">
                            <CardContent className="py-12 text-center">
                                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                <p className="text-muted-foreground">Вопросов пока нет. Добавьте первый!</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {faqItems.map((item, index) => (
                                <Card key={item.id} className={`rounded-2xl overflow-hidden transition-all ${!item.is_active ? 'opacity-60 grayscale' : ''}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="rounded-md font-normal text-[10px] uppercase tracking-wider">
                                                        {FAQ_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                                                    </Badge>
                                                    {!item.is_active && <Badge variant="secondary">Скрыт</Badge>}
                                                </div>
                                                <h3 className="font-semibold text-lg">{item.question}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2">{item.answer}</p>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg"
                                                        onClick={() => onEdit(item)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => onDelete(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg"
                                                        disabled={index === 0}
                                                        onClick={() => handleMove(index, 'up')}
                                                    >
                                                        <MoveUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg"
                                                        disabled={index === faqItems.length - 1}
                                                        onClick={() => handleMove(index, 'down')}
                                                    >
                                                        <MoveDown className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
