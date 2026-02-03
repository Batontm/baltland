"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { getDuplicateSettlements, renameSettlement } from "@/app/actions"
import { AlertTriangle, Edit2, RefreshCw } from "lucide-react"

interface DuplicateInDistrict {
    name: string
    district: string
    count: number
    codes: string[]
}

interface DuplicateAcrossDistricts {
    name: string
    districts: string[]
    count: number
}

export function DuplicateAddressesTab() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [duplicatesInDistrict, setDuplicatesInDistrict] = useState<DuplicateInDistrict[]>([])
    const [duplicatesAcrossDistricts, setDuplicatesAcrossDistricts] = useState<DuplicateAcrossDistricts[]>([])

    // Rename dialog state
    const [renameDialogOpen, setRenameDialogOpen] = useState(false)
    const [selectedCode, setSelectedCode] = useState<string>("")
    const [selectedOldName, setSelectedOldName] = useState<string>("")
    const [newName, setNewName] = useState<string>("")
    const [renaming, setRenaming] = useState(false)

    const loadDuplicates = async () => {
        setLoading(true)
        try {
            const result = await getDuplicateSettlements()
            setDuplicatesInDistrict(result.inDistrict)
            setDuplicatesAcrossDistricts(result.acrossDistricts)
        } catch (error) {
            console.error("Error loading duplicates:", error)
            toast({
                title: "Ошибка",
                description: "Не удалось загрузить данные о дублях",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDuplicates()
    }, [])

    const handleOpenRenameDialog = (code: string, currentName: string) => {
        setSelectedCode(code)
        setSelectedOldName(currentName)
        setNewName(currentName)
        setRenameDialogOpen(true)
    }

    const handleRename = async () => {
        if (!selectedCode || !newName.trim()) return

        setRenaming(true)
        try {
            const result = await renameSettlement(selectedCode, newName.trim())

            if (result.success) {
                toast({
                    title: "Переименовано",
                    description: `Поселок переименован. Обновлено участков: ${result.updatedPlots}`,
                })
                setRenameDialogOpen(false)
                await loadDuplicates()
            } else {
                toast({
                    title: "Ошибка",
                    description: result.error || "Не удалось переименовать",
                    variant: "destructive",
                })
            }
        } catch (error) {
            toast({
                title: "Ошибка",
                description: String(error),
                variant: "destructive",
            })
        } finally {
            setRenaming(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Rename Dialog */}
            <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Переименовать поселок</AlertDialogTitle>
                        <AlertDialogDescription>
                            Переименование поселка автоматически обновит все связанные земельные участки.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Текущее название</Label>
                            <div className="text-sm text-muted-foreground">{selectedOldName}</div>
                        </div>
                        <div className="space-y-2">
                            <Label>Новое название</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Введите новое название"
                            />
                            <p className="text-xs text-muted-foreground">
                                Например: {selectedOldName} (ул. Центральная) или {selectedOldName} 1
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">КЛАДР код</Label>
                            <div className="text-xs font-mono bg-muted px-2 py-1 rounded">{selectedCode}</div>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={renaming}>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRename}
                            disabled={renaming || !newName.trim() || newName === selectedOldName}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {renaming ? "Переименование..." : "Переименовать"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Дубли адресов</h2>
                    <p className="text-muted-foreground">
                        Управление дублирующимися названиями поселков в базе КЛАДР
                    </p>
                </div>
                <Button variant="outline" onClick={loadDuplicates} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Обновить
                </Button>
            </div>

            {/* Duplicates within the same district - CRITICAL */}
            <Card className="rounded-2xl border-orange-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <CardTitle className="text-orange-700">Дубли в одном районе</CardTitle>
                    </div>
                    <CardDescription>
                        Поселки с одинаковыми названиями внутри одного района. Рекомендуется переименовать для уникальности.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                    ) : duplicatesInDistrict.length === 0 ? (
                        <div className="text-center py-8 text-green-600">
                            ✓ Дублей в одном районе не найдено
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {duplicatesInDistrict.map((dup, idx) => (
                                <div key={idx} className="border rounded-lg p-4 bg-orange-50/50">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="font-semibold text-lg">{dup.name}</div>
                                            <div className="text-sm text-muted-foreground">{dup.district}</div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {dup.codes.map((code) => (
                                                    <div key={code} className="flex items-center gap-2">
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {code}
                                                        </Badge>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2"
                                                            onClick={() => handleOpenRenameDialog(code, dup.name)}
                                                        >
                                                            <Edit2 className="h-3 w-3 mr-1" />
                                                            Переименовать
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Badge variant="destructive">{dup.count} записей</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Duplicates across different districts - INFO */}
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle>Одинаковые названия в разных районах</CardTitle>
                    <CardDescription>
                        Это НЕ дубли — просто разные поселки с одинаковыми названиями в разных районах.
                        Переименование не требуется, если район указан корректно.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                    ) : duplicatesAcrossDistricts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Нет данных</div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {duplicatesAcrossDistricts.slice(0, 50).map((dup, idx) => (
                                <div key={idx} className="border rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-medium">{dup.name}</div>
                                        <Badge variant="secondary">{dup.districts.length} районов</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {dup.districts.join(", ")}
                                    </div>
                                </div>
                            ))}
                            {duplicatesAcrossDistricts.length > 50 && (
                                <div className="text-center text-sm text-muted-foreground py-2">
                                    ... и ещё {duplicatesAcrossDistricts.length - 50} поселков
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
