"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { AddressCombobox } from "@/components/ui/address-combobox"
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
import {
    getDistricts,
    getSettlementsByDistrictName,
    getSettlementDescription,
    upsertSettlementDescriptionWithFlags,
    deleteSettlementDescription,
    getSettlementDescriptions,
    applySettlementDescriptionToPlots,
    generateSettlementDescription,
    clearAllLandPlots,
    getOrganizationSettings,
    updateOrganizationSettings,
} from "@/app/actions"
import type { District, Settlement, SettlementDescription } from "@/lib/types"
import { Sparkles, Loader2, Trash2, AlertTriangle, Save } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function SettlementDescriptionsTab() {
    const { toast } = useToast()

    const [showClearAllDialog, setShowClearAllDialog] = useState(false)
    const [clearingAll, setClearingAll] = useState(false)

    // Address data
    const [districts, setDistricts] = useState<District[]>([])
    const [loadingAddresses, setLoadingAddresses] = useState(false)

    // Description editor state
    const [descDistrict, setDescDistrict] = useState<string>("all")
    const [descSettlement, setDescSettlement] = useState<string>("")
    const [descSettlements, setDescSettlements] = useState<Settlement[]>([])
    const [descText, setDescText] = useState<string>("")
    const [descDisclaimer, setDescDisclaimer] = useState<string>("")
    const [descFlags, setDescFlags] = useState({
        has_gas: false,
        has_electricity: false,
        has_water: false,
        has_installment: false,
        is_featured: false,
    })
    const [savingDesc, setSavingDesc] = useState(false)

    // Saved descriptions list
    const [savedDescriptions, setSavedDescriptions] = useState<SettlementDescription[]>([])
    const [listDistrictFilter, setListDistrictFilter] = useState<string>("all")
    const [listSettlementFilter, setListSettlementFilter] = useState<string>("all")
    const [applyingSettlement, setApplyingSettlement] = useState<string | null>(null)

    // Apply confirmation dialog state
    const [applyDialogOpen, setApplyDialogOpen] = useState(false)
    const [pendingApplyDescription, setPendingApplyDescription] = useState<SettlementDescription | null>(null)

    // AI generation state
    const [generatingAI, setGeneratingAI] = useState(false)

    // Import JSON state
    const [importing, setImporting] = useState(false)

    // Global disclaimer state
    const [globalDisclaimer, setGlobalDisclaimer] = useState<string>("")
    const [savingDisclaimer, setSavingDisclaimer] = useState(false)

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setLoadingAddresses(true)
            try {
                const [districtsData, descriptionsData] = await Promise.all([
                    getDistricts(),
                    getSettlementDescriptions(),
                ])
                setDistricts(districtsData)
                setSavedDescriptions(descriptionsData)

                // Load global disclaimer from organization settings
                const orgSettings = await getOrganizationSettings()
                if (orgSettings?.plot_description_disclaimer) {
                    setGlobalDisclaimer(orgSettings.plot_description_disclaimer)
                }
            } catch (error) {
                console.error("Error loading data:", error)
            } finally {
                setLoadingAddresses(false)
            }
        }
        loadData()
    }, [])

    const reloadDescriptions = async () => {
        try {
            const descriptionsData = await getSettlementDescriptions()
            setSavedDescriptions(descriptionsData)
        } catch (error) {
            console.error("Error reloading descriptions:", error)
        }
    }

    const handleImportJson = async (file: File) => {
        setImporting(true)
        try {
            const fd = new FormData()
            fd.append("file", file)

            const res = await fetch("/api/admin/settlement-descriptions/import", {
                method: "POST",
                body: fd,
            })

            const json = await res.json().catch(() => null)
            if (!res.ok || !json?.success) {
                toast({
                    title: "Ошибка",
                    description: json?.error || "Не удалось импортировать",
                    variant: "destructive",
                })
                return
            }

            toast({
                title: "Импорт выполнен",
                description: `Импортировано: ${json.imported || 0}`,
            })

            await reloadDescriptions()
        } catch (e) {
            toast({
                title: "Ошибка",
                description: String(e),
                variant: "destructive",
            })
        } finally {
            setImporting(false)
        }
    }

    // Load settlements when district changes for editor
    const loadDescSettlements = async (districtName: string) => {
        try {
            const settlementsData = await getSettlementsByDistrictName(districtName)
            setDescSettlements(settlementsData)
        } catch (error) {
            console.error("Error loading settlements:", error)
        }
    }

    const handleDescDistrictChange = async (districtName: string) => {
        setDescDistrict(districtName || "all")
        setDescSettlement("")
        setDescText("")
        setDescDisclaimer("")
        setDescFlags({
            has_gas: false,
            has_electricity: false,
            has_water: false,
            has_installment: false,
            is_featured: false,
        })
        if (!districtName || districtName === "all") {
            setDescSettlements([])
            return
        }
        await loadDescSettlements(districtName)
    }

    const handleDescSettlementChange = async (settlementName: string) => {
        setDescSettlement(settlementName)
        if (!descDistrict || descDistrict === "all" || !settlementName) {
            setDescText("")
            setDescDisclaimer("")
            setDescFlags({
                has_gas: false,
                has_electricity: false,
                has_water: false,
                has_installment: false,
                is_featured: false,
            })
            return
        }

        try {
            const row = await getSettlementDescription(descDistrict, settlementName)
            setDescText(row?.description || "")
            setDescDisclaimer(row?.disclaimer || "")
            setDescFlags({
                has_gas: Boolean(row?.has_gas),
                has_electricity: Boolean(row?.has_electricity),
                has_water: Boolean(row?.has_water),
                has_installment: Boolean(row?.has_installment),
                is_featured: Boolean(row?.is_featured),
            })
        } catch (e) {
            console.error("Failed to load settlement description:", e)
            setDescText("")
            setDescDisclaimer("")
            setDescFlags({
                has_gas: false,
                has_electricity: false,
                has_water: false,
                has_installment: false,
                is_featured: false,
            })
        }
    }

    const handleSaveSettlementDescription = async () => {
        if (!descDistrict || descDistrict === "all" || !descSettlement) return
        setSavingDesc(true)
        try {
            const updated = await upsertSettlementDescriptionWithFlags(descDistrict, descSettlement, {
                description: descText.trim(),
                disclaimer: descDisclaimer.trim(),
                has_gas: descFlags.has_gas,
                has_electricity: descFlags.has_electricity,
                has_water: descFlags.has_water,
                has_installment: descFlags.has_installment,
                is_featured: descFlags.is_featured,
            })
            setSavedDescriptions((prev) => {
                const next = prev.filter(
                    (p) => !(p.district_name === updated.district_name && p.settlement_name === updated.settlement_name)
                )
                return [updated, ...next]
            })

            toast({
                title: "Сохранено",
                description: `Описание для ${descSettlement} обновлено`,
            })
        } catch (e) {
            toast({
                title: "Ошибка",
                description: String(e),
                variant: "destructive",
            })
        } finally {
            setSavingDesc(false)
        }
    }

    const handleEditSettlementDescription = async (d: SettlementDescription) => {
        setDescDistrict(d.district_name)
        await loadDescSettlements(d.district_name)
        setDescSettlement(d.settlement_name)
        setDescText(d.description || "")
        setDescDisclaimer(d.disclaimer || "")
        setDescFlags({
            has_gas: Boolean(d.has_gas),
            has_electricity: Boolean(d.has_electricity),
            has_water: Boolean(d.has_water),
            has_installment: Boolean(d.has_installment),
            is_featured: Boolean(d.is_featured),
        })
    }

    const handleDeleteSettlementDescription = async (districtName: string, settlementName: string) => {
        if (!confirm(`Удалить описание для ${settlementName}?`)) return
        try {
            await deleteSettlementDescription(districtName, settlementName)
            setSavedDescriptions((prev) =>
                prev.filter((p) => !(p.district_name === districtName && p.settlement_name === settlementName))
            )

            toast({
                title: "Удалено",
                description: `Описание для ${settlementName} удалено`,
            })

            if (descDistrict === districtName && descSettlement === settlementName) {
                setDescText("")
                setDescDisclaimer("")
            }
        } catch (e) {
            toast({
                title: "Ошибка",
                description: String(e),
                variant: "destructive",
            })
        }
    }

    const handleApplyDescriptionToPlots = async (d: SettlementDescription) => {
        const hasAnyFlag =
            Boolean(d.has_gas) ||
            Boolean(d.has_electricity) ||
            Boolean(d.has_water) ||
            Boolean(d.has_installment) ||
            Boolean(d.is_featured)

        if (!d.description?.trim() && !hasAnyFlag) {
            toast({
                title: "Ошибка",
                description: "Описание пустое и флаги не выбраны. Сначала добавьте описание или включите нужные переключатели.",
                variant: "destructive",
            })
            return
        }

        // Open confirmation dialog instead of using confirm()
        setPendingApplyDescription(d)
        setApplyDialogOpen(true)
    }

    const confirmApplyDescription = async () => {
        const d = pendingApplyDescription
        if (!d) return

        setApplyDialogOpen(false)
        setApplyingSettlement(d.settlement_name)

        try {
            const result = await applySettlementDescriptionToPlots(d.settlement_name, d.description || "", d.district_name, {
                has_gas: Boolean(d.has_gas),
                has_electricity: Boolean(d.has_electricity),
                has_water: Boolean(d.has_water),
                has_installment: Boolean(d.has_installment),
                is_featured: Boolean(d.is_featured),
            })

            if (result.success) {
                toast({
                    title: "Применено",
                    description: `Найдено: ${result.matchedCount}, обновлено: ${result.updatedCount} (поселок: ${d.settlement_name})`,
                })
            } else {
                toast({
                    title: "Ошибка",
                    description: result.error || "Не удалось применить описание",
                    variant: "destructive",
                })
            }
        } catch (e) {
            toast({
                title: "Ошибка",
                description: String(e),
                variant: "destructive",
            })
        } finally {
            setApplyingSettlement(null)
            setPendingApplyDescription(null)
        }
    }

    return (
        <div className="space-y-6">
            <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить ВСЕ участки?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы собираетесь удалить абсолютно все участки из базы данных.
                            Это действие необратимо. Вы уверены?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={clearingAll}>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async (e) => {
                                e.preventDefault()
                                setClearingAll(true)
                                try {
                                    const res = await clearAllLandPlots()
                                    if (res.success) {
                                        toast({ title: "Удалено", description: res.message })
                                        setShowClearAllDialog(false)
                                    } else {
                                        toast({ title: "Ошибка", description: res.message, variant: "destructive" })
                                    }
                                } catch (error) {
                                    toast({ title: "Ошибка", description: "Произошла ошибка при удалении", variant: "destructive" })
                                    console.error(error)
                                } finally {
                                    setClearingAll(false)
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {clearingAll ? "Удаление..." : "Удалить всё"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Apply Confirmation Dialog */}
            <AlertDialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Применить описание?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Применить описание к всем участкам в «{pendingApplyDescription?.settlement_name}»?
                            <br /><br />
                            Это перезапишет существующее описание у всех участков в этом поселке.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingApplyDescription(null)}>
                            Отмена
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void confirmApplyDescription()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Применить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold">Описание поселков</h2>
                    <p className="text-muted-foreground">
                        Сохраненные описания можно подставлять при импорте участков
                    </p>
                </div>
            </div>

            {/* Global Disclaimer Card */}
            <Card className="rounded-2xl border-amber-300 bg-amber-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-5 w-5" />
                        Глобальный дисклеймер для ВСЕХ участков
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                        Этот текст отображается на странице каждого участка
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="bg-amber-100 border-amber-300 text-amber-900">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Внимание!</strong> Этот дисклеймер добавляется ко ВСЕМ участкам на сайте.
                            Изменения сразу отразятся на всех страницах объявлений.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label className="text-amber-800 font-semibold">Текст дисклеймера</Label>
                        <Textarea
                            value={globalDisclaimer}
                            onChange={(e) => setGlobalDisclaimer(e.target.value)}
                            placeholder="Введите текст дисклеймера..."
                            className="rounded-xl min-h-24 max-h-40 overflow-y-auto resize-y bg-white border-amber-200 font-mono text-sm"
                            rows={5}
                        />
                        <p className="text-xs text-amber-700">
                            Этот текст автоматически добавляется в конец описания каждого участка.
                        </p>
                    </div>

                    <Button
                        onClick={async () => {
                            setSavingDisclaimer(true)
                            try {
                                await updateOrganizationSettings({ plot_description_disclaimer: globalDisclaimer })
                                toast({
                                    title: "Сохранено",
                                    description: "Глобальный дисклеймер обновлен",
                                })
                            } catch (e) {
                                toast({
                                    title: "Ошибка",
                                    description: String(e),
                                    variant: "destructive",
                                })
                            } finally {
                                setSavingDisclaimer(false)
                            }
                        }}
                        disabled={savingDisclaimer}
                        className="gap-2 bg-amber-600 hover:bg-amber-700"
                    >
                        <Save className="h-4 w-4" />
                        {savingDisclaimer ? "Сохранение..." : "Сохранить дисклеймер"}
                    </Button>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    variant="destructive"
                    className="rounded-xl"
                    disabled={clearingAll}
                    onClick={() => setShowClearAllDialog(true)}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить все
                </Button>
            </div>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle>Импорт описаний (JSON)</CardTitle>
                    <CardDescription>
                        Загрузите JSON файл формата {'{'}"items":[{'{'}district, settlement, description, has_gas, has_electricity, has_water, has_installment, is_featured{'}'}]{'}'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            accept="application/json,.json"
                            disabled={importing}
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                void handleImportJson(file)
                                e.currentTarget.value = ""
                            }}
                        />
                        <div className="text-sm text-muted-foreground">
                            {importing ? "Импорт..." : "Выберите .json файл"}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle>Редактор описания</CardTitle>
                    <CardDescription>Выберите район и населенный пункт для редактирования</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Район</Label>
                            <AddressCombobox
                                value={descDistrict === "all" ? "" : descDistrict}
                                onValueChange={(value) => void handleDescDistrictChange(value || "all")}
                                options={districts.map((d) => ({ id: d.id, name: d.name }))}
                                placeholder="Выберите район"
                                searchPlaceholder="Поиск района..."
                                emptyText="Район не найден"
                                loading={loadingAddresses}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Населенный пункт</Label>
                            <AddressCombobox
                                value={descSettlement}
                                onValueChange={(value) => void handleDescSettlementChange(value)}
                                options={descSettlements.map((s) => ({ id: s.id, name: s.name }))}
                                placeholder={!descDistrict || descDistrict === "all" ? "Сначала выберите район" : "Выберите населенный пункт"}
                                searchPlaceholder="Поиск населенного пункта..."
                                emptyText="Населенный пункт не найден"
                                disabled={!descDistrict || descDistrict === "all"}
                                loading={loadingAddresses}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Описание</Label>
                        <Textarea
                            value={descText}
                            onChange={(e) => setDescText(e.target.value)}
                            placeholder="Введите описание для выбранного поселка"
                            className="rounded-xl min-h-24 max-h-60 overflow-y-auto resize-y"
                            disabled={!descSettlement}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Коммуникации и настройки поселка</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <CommunicationSwitch
                                label="Газ"
                                checked={descFlags.has_gas}
                                onCheckedChange={(v: boolean) => setDescFlags((prev) => ({ ...prev, has_gas: v }))}
                            />
                            <CommunicationSwitch
                                label="Электр."
                                checked={descFlags.has_electricity}
                                onCheckedChange={(v: boolean) => setDescFlags((prev) => ({ ...prev, has_electricity: v }))}
                            />
                            <CommunicationSwitch
                                label="Вода"
                                checked={descFlags.has_water}
                                onCheckedChange={(v: boolean) => setDescFlags((prev) => ({ ...prev, has_water: v }))}
                            />
                            <CommunicationSwitch
                                label="Рассрочка"
                                checked={descFlags.has_installment}
                                onCheckedChange={(v: boolean) => setDescFlags((prev) => ({ ...prev, has_installment: v }))}
                            />
                            <CommunicationSwitch
                                label="Избранный"
                                checked={descFlags.is_featured}
                                onCheckedChange={(v: boolean) => setDescFlags((prev) => ({ ...prev, is_featured: v }))}
                                className="bg-amber-50 border-amber-100"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-between">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                if (!descDistrict || descDistrict === "all" || !descSettlement) {
                                    toast({
                                        title: "Ошибка",
                                        description: "Сначала выберите район и населенный пункт",
                                        variant: "destructive",
                                    })
                                    return
                                }
                                setGeneratingAI(true)
                                try {
                                    const result = await generateSettlementDescription(descDistrict, descSettlement)
                                    if (result.success && result.description) {
                                        setDescText(result.description)
                                        toast({
                                            title: "Сгенерировано",
                                            description: "Описание сгенерировано с помощью ИИ",
                                        })
                                    } else {
                                        toast({
                                            title: "Ошибка",
                                            description: result.error || "Не удалось сгенерировать описание",
                                            variant: "destructive",
                                        })
                                    }
                                } catch (e) {
                                    toast({
                                        title: "Ошибка",
                                        description: String(e),
                                        variant: "destructive",
                                    })
                                } finally {
                                    setGeneratingAI(false)
                                }
                            }}
                            disabled={generatingAI || !descDistrict || descDistrict === "all" || !descSettlement}
                            className="gap-2"
                        >
                            {generatingAI ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Генерация...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Сгенерировать с ИИ
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleSaveSettlementDescription}
                            disabled={savingDesc || !descDistrict || descDistrict === "all" || !descSettlement}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {savingDesc ? "Сохранение..." : "Сохранить описание"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle>Сохраненные описания</CardTitle>
                    <CardDescription>Список всех сохраненных описаний поселков</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Район</Label>
                            <AddressCombobox
                                value={listDistrictFilter === "all" ? "" : listDistrictFilter}
                                onValueChange={(value) => {
                                    setListDistrictFilter(value || "all")
                                    setListSettlementFilter("all")
                                }}
                                options={districts.map((d) => ({ id: d.id, name: d.name }))}
                                placeholder="Все районы"
                                searchPlaceholder="Поиск района..."
                                emptyText="Район не найден"
                                loading={loadingAddresses}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Поселок</Label>
                            <AddressCombobox
                                value={listSettlementFilter === "all" ? "" : listSettlementFilter}
                                onValueChange={(value) => setListSettlementFilter(value || "all")}
                                options={Array.from(
                                    new Map(
                                        savedDescriptions
                                            .filter((d) => listDistrictFilter === "all" || d.district_name === listDistrictFilter)
                                            .map((d) => [d.settlement_name, d.settlement_name])
                                    ).values()
                                ).map((name) => ({ id: name, name }))}
                                placeholder={listDistrictFilter === "all" ? "Все поселки" : "Все поселки района"}
                                searchPlaceholder="Поиск поселка..."
                                emptyText="Поселок не найден"
                                loading={false}
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="border rounded-xl p-3 max-h-96 overflow-y-auto space-y-2">
                        {savedDescriptions
                            .filter((d) => (listDistrictFilter === "all" ? true : d.district_name === listDistrictFilter))
                            .filter((d) => (listSettlementFilter === "all" ? true : d.settlement_name === listSettlementFilter))
                            .map((d) => (
                                <div key={`${d.district_name}||${d.settlement_name}`} className="border rounded-lg px-3 py-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-semibold truncate">{d.settlement_name}</div>
                                            <div className="text-xs text-muted-foreground truncate">{d.district_name}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                                disabled={applyingSettlement === d.settlement_name}
                                                onClick={() => void handleApplyDescriptionToPlots(d)}
                                            >
                                                {applyingSettlement === d.settlement_name ? "Применение..." : "Применить"}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => void handleEditSettlementDescription(d)}>
                                                Редактировать
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void handleDeleteSettlementDescription(d.district_name, d.settlement_name)}
                                            >
                                                Удалить
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                        {savedDescriptions.length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-6">Пока нет сохраненных описаний</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}

function CommunicationSwitch({ label, checked, onCheckedChange, className }: any) {
    return (
        <div
            className={
                "flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-transparent " +
                (className || "")
            }
        >
            <span className="text-sm font-medium">{label}</span>
            <Switch checked={checked || false} onCheckedChange={onCheckedChange} />
        </div>
    )
}
