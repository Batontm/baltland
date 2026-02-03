"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { Label } from "@/components/ui/label"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, CheckCircle2, AlertCircle, FileText, Info, Loader2, MapPin, MapPinOff, Shapes, XCircle } from "lucide-react"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  syncLandPlotsFromData,
  exportLandPlotsToJSON,
  getDistricts,
  getSettlementsByDistrictName,
  getSettlementDescription,
  resolveLocationByCadastral,
  createImportLog,
} from "@/app/actions"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AddressCombobox } from "@/components/ui/address-combobox"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { District, LandPlotData, Settlement, SettlementDescription, SyncResult } from "@/lib/types"

interface LandPlotImporterProps {
  onImport?: (result: SyncResult) => void
}

export function LandPlotImporter({ onImport }: LandPlotImporterProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState(-1)
  const [importProgress, setImportProgress] = useState(0)
  const [importStage, setImportStage] = useState<string>("")
  const [lastPreviewError, setLastPreviewError] = useState<string>("")
  const [lastImportError, setLastImportError] = useState<{ title: string; message: string; details?: string } | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showImportProgressDialog, setShowImportProgressDialog] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [allResults, setAllResults] = useState<SyncResult[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showSettlementDialog, setShowSettlementDialog] = useState(false)
  const [autoResolve, setAutoResolve] = useState(true)
  const [selectedDistrict, setSelectedDistrict] = useState("all")
  const [selectedSettlement, setSelectedSettlement] = useState("")
  const [detectedSettlement, setDetectedSettlement] = useState("")
  const [settlementDescription, setSettlementDescription] = useState("")
  const [descriptionMode, setDescriptionMode] = useState<"saved" | "manual">("saved")
  const [savedSettlementDescription, setSavedSettlementDescription] = useState<string>("")

  const [previewPlots, setPreviewPlots] = useState<LandPlotData[] | null>(null)
  const [previewReady, setPreviewReady] = useState(false)
  const [resolveProgressByCad, setResolveProgressByCad] = useState<
    Record<string, { percent: number; status: "pending" | "resolving" | "resolved" | "error" | "skipped" }>
  >({})
  const [coordsSourceByCad, setCoordsSourceByCad] = useState<Record<string, "file" | "nspd" | "none">>({})
  const [nspdContourByCad, setNspdContourByCad] = useState<Record<string, boolean>>({})
  const [importDetailByCad, setImportDetailByCad] = useState<Record<string, { status: string; message: string }>>({})
  const [previewCadDiagnostics, setPreviewCadDiagnostics] = useState<{
    totalRows: number
    nonEmptyCadastralRows: number
    uniqueCadastrals: number
    duplicateRows: number
    duplicates: Array<{ cadastral: string; count: number }>
    emptyCadastralRows: number
  } | null>(null)

  const [districts, setDistricts] = useState<District[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const { toast } = useToast()

  const formatErrorText = (e: unknown) => {
    try {
      if (e instanceof Error) return e.message || String(e)
      if (typeof e === "string") return e
      if (typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string") {
        return (e as any).message
      }
      return JSON.stringify(e)
    } catch {
      return String(e)
    }
  }

  const formatErrorDetails = (e: unknown) => {
    try {
      if (e instanceof Error) {
        const parts = [e.stack, String((e as any).cause || "")].filter(Boolean)
        return parts.join("\n")
      }
      if (typeof e === "string") return ""
      return JSON.stringify(e, null, 2)
    } catch {
      return ""
    }
  }


  const loadDistricts = async () => {
    setLoadingAddresses(true)
    try {
      const data = await getDistricts()
      setDistricts(data)
    } catch (error) {
      console.error("[v0] Error loading districts:", error)
    } finally {
      setLoadingAddresses(false)
    }
  }

  const detectDistrictAndSettlementFromRows = (rows: Array<Record<string, unknown>>) => {
    const settlementCounts = new Map<string, number>()
    const districtCounts = new Map<string, number>()

    for (const row of rows) {
      const settlement = String(
        row["Населенный пункт"] ?? (row as any).location ?? (row as any).settlement ?? ""
      ).trim()
      const district = String(row["Район"] ?? (row as any).district ?? "").trim()

      if (settlement) settlementCounts.set(settlement, (settlementCounts.get(settlement) || 0) + 1)
      if (district) districtCounts.set(district, (districtCounts.get(district) || 0) + 1)
    }

    const pickMostFrequent = (m: Map<string, number>) => {
      let best: string | undefined
      let bestCount = -1
      for (const [k, c] of m.entries()) {
        if (c > bestCount) {
          best = k
          bestCount = c
        }
      }
      return best
    }

    return {
      settlement: pickMostFrequent(settlementCounts),
      district: pickMostFrequent(districtCounts),
    }
  }

  const autoDetectAndGeneratePreview = async (files: File[]) => {
    // Show analysis dialog immediately; it will render loading state until previewReady.
    setShowPreviewDialog(true)

    try {
      setImportStage("Анализ: определение поселка...")
      setImportProgress(2)

      // Parse first file to detect (fast enough and avoids parsing everything twice)
      const rows = await parseFileToData(files[0])
      const { settlement, district } = detectDistrictAndSettlementFromRows(rows as any)

      if (!settlement) {
        toast({
          title: "Не удалось определить поселок",
          description: "Добавьте колонку «Населенный пункт» (или location) в файл или выберите поселок вручную.",
          variant: "destructive",
        })
        setShowPreviewDialog(false)
        setShowSettlementDialog(true)
        return
      }

      // Apply detected values
      setSelectedSettlement(settlement)
      setDetectedSettlement(settlement)

      if (district) {
        setSelectedDistrict(district)
        // We don't strictly need settlements list here, but keep it consistent.
        void loadSettlements(district)
      }

      // Load saved description immediately (so preview uses it)
      if (descriptionMode === "saved" && district) {
        try {
          const row = await getSettlementDescription(district, settlement)
          const saved = row?.description || ""
          setSavedSettlementDescription(saved)
          setSettlementDescription(saved)
        } catch (e) {
          console.error("[autoDetectAndGeneratePreview] Failed to load saved description:", e)
          setSavedSettlementDescription("")
          setSettlementDescription("")
        }
      }

      // Ensure manual selection dialog is not shown
      setShowSettlementDialog(false)

      // Build preview
      await handleGeneratePreview({
        files,
        district: district || "all",
        settlement,
        description: descriptionMode === "saved" ? (savedSettlementDescription || settlementDescription || "") : settlementDescription,
      })
    } catch (e) {
      console.error("[autoDetectAndGeneratePreview] Error:", e)
      toast({
        title: "Ошибка анализа файла",
        description: String(e),
        variant: "destructive",
      })
      setShowPreviewDialog(false)
    }
  }

  const resetImportFlow = () => {
    setSelectedFiles([])
    setPreviewPlots(null)
    setPreviewReady(false)
    setAllResults([])
    setResolveProgressByCad({})
    setCoordsSourceByCad({})
    setNspdContourByCad({})
    setImportDetailByCad({})
    setImportProgress(0)
    setImportStage("")
    setCurrentFileIndex(-1)
    setShowSettlementDialog(false)
    setShowPreviewDialog(false)
    setShowImportProgressDialog(false)
  }

  const loadSettlements = async (districtName: string) => {
    setLoadingAddresses(true)
    try {
      const data = await getSettlementsByDistrictName(districtName)
      setSettlements(data)
    } catch (error) {
      console.error("[v0] Error loading settlements:", error)
      setSettlements([])
    } finally {
      setLoadingAddresses(false)
    }
  }

  const handleDistrictChange = async (districtName: string) => {
    setSelectedDistrict(districtName || "all")
    setSelectedSettlement("")

    if (!districtName || districtName === "all") {
      setSettlements([])
      return
    }
    await loadSettlements(districtName)
  }

  useEffect(() => {
    void loadDistricts()
  }, [])

  useEffect(() => {
    const loadForSelection = async () => {
      if (!selectedDistrict || selectedDistrict === "all" || !selectedSettlement) {
        setSavedSettlementDescription("")
        return
      }

      try {
        const row = await getSettlementDescription(selectedDistrict, selectedSettlement)
        setSavedSettlementDescription(row?.description || "")
      } catch (e) {
        console.error("[v0] Failed to load settlement description:", e)
        setSavedSettlementDescription("")
      }
    }
    void loadForSelection()
  }, [selectedDistrict, selectedSettlement])

  useEffect(() => {
    if (descriptionMode === "saved") {
      setSettlementDescription(savedSettlementDescription)
    }
  }, [descriptionMode, savedSettlementDescription])

  const downloadCSVTemplate = () => {
    const csvContent = `Заголовок,Кадастровый номер,КН1,КН2,КН3,Населенный пункт,Район,Цена (₽),Площадь (сот.),Статус земли,Форма владения,Аренда с,Аренда по,Bundle ID,Bundle Title,Bundle Primary,Газ,Электричество,Вода,Рассрочка
 Участок 6.75 сот.,39:03:090913:540,,,,пос. Поддубное,Гурьевский район,450000,6.75,ИЖС,Собственность,,,,,,Да,Да,Да,Нет
 Лот: 3 участка (главный),,39:03:090913:541,39:03:090913:542,39:03:090913:543,пос. Поддубное,Гурьевский район,1200000,8,ИЖС,Собственность,,,lot-poddubnoe-1,Лот: 3 участка,1,Да,Да,Да,Да
 Лот: 3 участка (аренда),39:03:090913:544,,,,пос. Поддубное,Гурьевский район,0,8,ИЖС,Аренда,2026-01-01,2046-01-01,lot-poddubnoe-1,Лот: 3 участка,,Да,Да,Да,Да`

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "template-import.csv"
    link.click()

    toast({
      title: "Шаблон CSV скачан",
      description: "Заполните файл данными и импортируйте обратно",
    })
  }

  const downloadJSONTemplate = () => {
    const jsonContent = {
      meta: {
        region: "Калининградская область",
        district: "Гурьевский район",
        settlement: "пос. Поддубное",
      },
      rows: [
        {
          title: "Участок 6.75 сот.",
          cadastral_number: "39:03:090913:540",
          district: "Гурьевский район",
          location: "пос. Поддубное",
          price_rub: 450000,
          area_sotka: 6.75,
          land_status: "ИЖС",
          ownership_type: "ownership",
          has_gas: true,
          has_electricity: true,
          has_water: true,
          has_installment: false,
        },
        {
          // Лот с единой ценой: цена только у primary, остальные участки в лоте ставим price_rub=0
          title: "Лот: 3 участка (главный)",
          district: "Гурьевский район",
          location: "пос. Поддубное",
          price_rub: 1200000,
          area_sotka: 8,
          land_status: "ИЖС",
          ownership_type: "ownership",
          bundle_id: "lot-poddubnoe-1",
          bundle_title: "Лот: 3 участка",
          is_bundle_primary: true,
          // Можно указать до 3 кадастров в одной строке:
          KN1: "39:03:090913:541",
          KN2: "39:03:090913:542",
          KN3: "39:03:090913:543",
        },
        {
          // Смешанный лот: тот же bundle_id, но другой тип владения
          title: "Лот: 3 участка (аренда)",
          cadastral_number: "39:03:090913:544",
          district: "Гурьевский район",
          location: "пос. Поддубное",
          price_rub: 0,
          area_sotka: 8,
          land_status: "ИЖС",
          ownership_type: "lease",
          lease_from: "2026-01-01",
          lease_to: "2046-01-01",
          bundle_id: "lot-poddubnoe-1",
          bundle_title: "Лот: 3 участка",
        },
      ],
    }

    const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: "application/json" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "template-import.json"
    link.click()

    toast({
      title: "Шаблон JSON скачан",
      description: "Заполните файл данными и импортируйте обратно",
    })
  }

  const downloadExcelTemplate = () => {
    const exampleData = [
      {
        Заголовок: "Участок 6.0 сот.",
        "Кадастровый номер": "39:03:090913:640",
        КН1: "",
        КН2: "",
        КН3: "",
        "Цена (₽)": 900000,
        "Площадь (сот.)": 6,
        Район: "Гурьевский район",
        "Населенный пункт": "пос. Поддубное",
        "Статус земли": "ИЖС",
        "Форма владения": "Собственность",
        "Аренда с": "",
        "Аренда по": "",
        "Bundle ID": "",
        "Bundle Title": "",
        "Bundle Primary": "",
        Газ: true,
        Электричество: true,
        Вода: true,
        Рассрочка: false,
      },
      {
        Заголовок: "Лот: 3 участка (главный)",
        "Кадастровый номер": "",
        КН1: "39:03:090913:641",
        КН2: "39:03:090913:642",
        КН3: "39:03:090913:643",
        "Цена (₽)": 1500000,
        "Площадь (сот.)": 10,
        Район: "Гурьевский район",
        "Населенный пункт": "пос. Поддубное",
        "Статус земли": "ИЖС",
        "Форма владения": "Собственность",
        "Аренда с": "",
        "Аренда по": "",
        "Bundle ID": "lot-poddubnoe-2",
        "Bundle Title": "Лот: 3 участка",
        "Bundle Primary": "1",
        Газ: true,
        Электричество: true,
        Вода: true,
        Рассрочка: true,
      },
      {
        Заголовок: "Лот: 3 участка (аренда)",
        "Кадастровый номер": "39:03:090913:644",
        КН1: "",
        КН2: "",
        КН3: "",
        "Цена (₽)": 0,
        "Площадь (сот.)": 10,
        Район: "Гурьевский район",
        "Населенный пункт": "пос. Поддубное",
        "Статус земли": "ИЖС",
        "Форма владения": "Аренда",
        "Аренда с": "2026-01-01",
        "Аренда по": "2046-01-01",
        "Bundle ID": "lot-poddubnoe-2",
        "Bundle Title": "Лот: 3 участка",
        "Bundle Primary": "",
        Газ: true,
        Электричество: true,
        Вода: true,
        Рассрочка: true,
      },
    ]

    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(exampleData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Участки")

      // Write to array buffer for browser download
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "template-land-plots.xlsx"
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    if (files.length === 0) return

    console.log("[v0] Selected files for upload:", files.map(f => f.name))
    setSelectedFiles(files)
    setShowSettlementDialog(false)
    setDetectedSettlement("")
    setPreviewPlots(null)
    setPreviewReady(false)
    setShowPreviewDialog(false)
    setShowImportProgressDialog(false)
    setNspdContourByCad({})

    // Clear input value to allow selecting same file again
    event.target.value = ""

    // For single PDF files, we still try to detect settlement
    if (files.length === 1 && files[0].name.endsWith(".pdf")) {
      try {
        setImportStage("Анализ PDF...")
        setImportProgress(10)
        // Background parsing so dialog doesn't hang
        void parsePDF(files[0]).then(({ settlement }) => {
          setDetectedSettlement(settlement)
          setImportProgress(20)
        }).catch(error => {
          console.error("[v0] PDF parsing error:", error)
        })
      } catch (error) {
        console.error("[v0] PDF parsing error setup:", error)
      }
    }

    // Auto-detect settlement for all supported formats and generate preview right away.
    void autoDetectAndGeneratePreview(files)
  }

  const coerceToRowsArray = (value: unknown, fileName: string): Array<Record<string, unknown>> => {
    if (Array.isArray(value)) return value as Array<Record<string, unknown>>

    if (value && typeof value === "object") {
      const v = value as Record<string, unknown>
      const candidates = [v.data, v.rows, v.plots]
      for (const c of candidates) {
        if (!Array.isArray(c)) continue

        // Special-case: JSON like { location, region, plots: [...] }
        // Put top-level location into each row so downstream mapping can use record.location.
        if (c === v.plots) {
          const topLocation = typeof v.location === "string" ? v.location.trim() : ""
          if (topLocation) {
            return (c as Array<Record<string, unknown>>).map((row) => ({
              ...row,
              location: (row as any).location ?? topLocation,
              settlement: (row as any).settlement ?? topLocation,
            }))
          }
        }

        return c as Array<Record<string, unknown>>
      }

      return [v]
    }

    const type = value === null ? "null" : typeof value
    throw new Error(`Файл ${fileName}: ожидается массив строк, получено ${type}`)
  }

  const parseFileToData = async (file: File): Promise<any[]> => {
    setImportStage(`Чтение файла: ${file.name}`)
    setImportProgress(2)

    try {
      let dataRaw: unknown

      if (file.name.endsWith(".pdf")) {
        const { plots } = await parsePDF(file)
        dataRaw = plots
      } else if (file.name.endsWith(".json")) {
        const text = await file.text()
        try {
          dataRaw = JSON.parse(text)
        } catch (e) {
          // Common user mistake: JSON copied from chat with markdown fences.
          // Try to strip ```json ... ``` and parse again.
          const trimmed = text.replace(/\uFEFF/g, "").trim()
          if (trimmed.startsWith("```")) {
            const unfenced = trimmed
              .replace(/^```[a-zA-Z0-9_-]*\s*/m, "")
              .replace(/\s*```\s*$/m, "")
              .trim()
            try {
              dataRaw = JSON.parse(unfenced)
            } catch {
              // fall through to detailed error
            }
            if (dataRaw !== undefined) {
              // successfully parsed after stripping fences
              // (dataRaw already set)
            } else {
              // keep going to detailed error below
            }
          }

          if (dataRaw !== undefined) {
            // successfully parsed via fallback
          } else {
          const head = text
            .slice(0, 200)
            .replace(/\uFEFF/g, "")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
          const hint = head.trim().startsWith("{") || head.trim().startsWith("[")
            ? "Проверь, что внутри нет лишних запятых, неэкранированных переносов строк или \\\" в строках."
            : "Похоже, в файле есть лишний текст (например, 'Конечно...') — оставь в файле только чистый JSON, начиная с { или [."
          const msg = e instanceof Error ? e.message : String(e)
          throw new Error(`Файл ${file.name}: не удалось разобрать JSON. ${hint}\nНачало файла: ${head}\nДетали: ${msg}`)
          }
        }
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const arrayBuffer = await file.arrayBuffer()
        const workbook = await import("xlsx").then((XLSX) => XLSX.read(arrayBuffer, { type: "array" }))
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        dataRaw = await import("xlsx").then((XLSX) => XLSX.utils.sheet_to_json(firstSheet))
      } else if (file.name.endsWith(".csv")) {
        const text = await file.text()
        dataRaw = parseCSV(text)
      } else {
        throw new Error("Поддерживаются файлы CSV, JSON, Excel (XLSX/XLS) и PDF")
      }

      const data = coerceToRowsArray(dataRaw, file.name)
      if (data.length === 0) {
        throw new Error(`Файл ${file.name}: не удалось извлечь ни одной строки данных`)
      }
      return data
    } catch (error) {
      console.error(`[v0] Error parsing ${file.name}:`, error)
      throw error
    }
  }

  const RESOLVE_ADDRESS_TIMEOUT_MS = 90000

  const withTimeout = async <T,>(promise: Promise<T>, ms: number) => {
    return await new Promise<T>((resolve, reject) => {
      const seconds = Math.ceil(ms / 1000)
      const timeoutId = setTimeout(() => reject(new Error(`Timeout ${seconds}s`)), ms)
      promise
        .then((v) => {
          clearTimeout(timeoutId)
          resolve(v)
        })
        .catch((e) => {
          clearTimeout(timeoutId)
          reject(e)
        })
    })
  }

  const resolveAddressesForPlots = async (
    plots: any[],
    onProgress: (progress: number, message: string) => void
  ) => {
    const BATCH_SIZE = 2
    const results = [...plots]
    const timedOutCadastrals: string[] = []
    let nspdDisabled = false
    let consecutiveFailures = 0
    const MAX_CONSECUTIVE_FAILURES = 3

    for (let i = 0; i < plots.length; i += BATCH_SIZE) {
      const batch = plots.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map(async (plot, idx) => {
        const globalIdx = i + idx
        if (plot.cadastral_number) {
          if (nspdDisabled) {
            setResolveProgressByCad(prev => ({
              ...prev,
              [plot.cadastral_number]: { percent: 100, status: "skipped" },
            }))
            return
          }
          onProgress(
            (globalIdx / plots.length) * 100,
            `Определение адреса: ${plot.cadastral_number} (${globalIdx + 1}/${plots.length})`
          )
          try {
            setResolveProgressByCad(prev => ({
              ...prev,
              [plot.cadastral_number]: { percent: 30, status: "resolving" },
            }))
            const resolution = await withTimeout(resolveLocationByCadastral(plot.cadastral_number), RESOLVE_ADDRESS_TIMEOUT_MS)
            if (!resolution.error) {
              consecutiveFailures = 0
              setResolveProgressByCad(prev => ({
                ...prev,
                [plot.cadastral_number]: { percent: 70, status: "resolving" },
              }))
              if (resolution.district) results[globalIdx].district = resolution.district
              if (resolution.location) results[globalIdx].location = resolution.location
              if (resolution.land_status) results[globalIdx].land_status = resolution.land_status

              if (typeof resolution.center_lat === "number" && typeof resolution.center_lon === "number") {
                results[globalIdx].center_lat = resolution.center_lat
                results[globalIdx].center_lon = resolution.center_lon
                results[globalIdx].has_coordinates = true
                const cad = String(plot.cadastral_number || "").trim()
                if (cad) {
                  setCoordsSourceByCad(prev => ({
                    ...prev,
                    [cad]: prev[cad] === "file" ? "file" : "nspd",
                  }))
                }
              }

              if (typeof resolution.has_contour === "boolean") {
                const cad = String(plot.cadastral_number || "").trim()
                if (cad) {
                  setNspdContourByCad(prev => ({
                    ...prev,
                    [cad]: resolution.has_contour as boolean,
                  }))
                }
              }

              setResolveProgressByCad(prev => ({
                ...prev,
                [plot.cadastral_number]: { percent: 100, status: "resolved" },
              }))
            } else {
              consecutiveFailures++
              setResolveProgressByCad(prev => ({
                ...prev,
                [plot.cadastral_number]: { percent: 100, status: "error" },
              }))

              if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                nspdDisabled = true
                toast({
                  title: "НСПД временно недоступен",
                  description: "Продолжаю превью без автозаполнения адресов/геоданных (чтобы не ждать таймауты).",
                })
              }
            }
          } catch (e) {
            const msg = (e as any)?.message ? String((e as any).message) : String(e)
            const cad = String(plot.cadastral_number || "").trim()
            if (msg.startsWith("Timeout") || msg.includes("Timeout")) {
              if (cad) timedOutCadastrals.push(cad)
              console.warn(`NSPD resolve timeout for ${plot.cadastral_number}: ${msg}`)
            } else {
              console.warn(`Failed to resolve ${plot.cadastral_number}: ${msg}`)
            }
            consecutiveFailures++
            setResolveProgressByCad(prev => ({
              ...prev,
              [plot.cadastral_number]: { percent: 100, status: "error" },
            }))

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              nspdDisabled = true
              toast({
                title: "НСПД временно недоступен",
                description: "Продолжаю превью без автозаполнения адресов/геоданных (чтобы не ждать таймауты).",
              })
            }
          }
        }
      })

      await Promise.all(batchPromises)

      if (i + BATCH_SIZE < plots.length) {
        await new Promise((r) => setTimeout(r, 250))
      }
    }

    if (timedOutCadastrals.length > 0) {
      const unique = Array.from(new Set(timedOutCadastrals))
      toast({
        title: "НСПД: часть участков не успела ответить",
        description: `Таймаут по ${unique.length} кадастровым номерам. Превью продолжено, но адрес/координаты для них могут не заполниться автоматически.`,
      })
    }
    return results
  }

  const normalizeOwnershipType = (value: unknown): "ownership" | "lease" => {
    const v = String(value || "").trim().toLowerCase()
    if (!v) return "ownership"
    if (v === "lease" || v === "rent" || v.includes("аренд")) return "lease"
    return "ownership"
  }

  const normalizeBundlesForPreview = (plots: LandPlotData[]): LandPlotData[] => {
    const byBundle = new Map<string, LandPlotData[]>()
    const noBundle: LandPlotData[] = []

    for (const p of plots) {
      const bid = p.bundle_id
      if (!bid) {
        noBundle.push(p)
        continue
      }
      const arr = byBundle.get(bid) || []
      arr.push(p)
      byBundle.set(bid, arr)
    }

    const out: LandPlotData[] = []
    for (const [bundleId, group] of byBundle.entries()) {
      if (group.length <= 1) {
        out.push(...group)
        continue
      }

      // Choose primary:
      // 1) explicit flag
      // 2) first item in group (new lot schema requirement)
      let primaryIdx = group.findIndex((g) => g.is_bundle_primary)
      if (primaryIdx < 0) primaryIdx = 0

      const locationForTitle = (group[0]?.location || "").trim()
      const bundleTitle = (group[0]?.bundle_title || `Лот из ${group.length} участков${locationForTitle ? ` (${locationForTitle})` : ""}`).trim()

      for (let i = 0; i < group.length; i++) {
        const isPrimary = i === primaryIdx
        const item = group[i]
        out.push({
          ...item,
          bundle_id: bundleId,
          bundle_title: bundleTitle,
          is_bundle_primary: isPrimary,
          price: isPrimary ? Number(item.price || 0) : 0,
        })
      }
    }

    // Sort: bundle groups first by bundle_id, primary first inside group
    const sortKey = (p: LandPlotData) => `${p.bundle_id || ""}__${p.is_bundle_primary ? "0" : "1"}__${p.cadastral_number}`
    return [...out, ...noBundle].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  }

  const computeLotSummary = (plots: LandPlotData[]) => {
    const groups = new Map<string, number>()
    for (const p of plots) {
      const bid = (p.bundle_id || "").trim()
      if (!bid) continue
      groups.set(bid, (groups.get(bid) || 0) + 1)
    }
    const lots = Array.from(groups.values()).filter((n) => n > 1).length
    const singles = plots.filter((p) => !p.bundle_id || (groups.get(p.bundle_id) || 0) <= 1).length
    const total = plots.filter((p) => (p.cadastral_number || "").trim()).length
    return { lots, singles, total }
  }

  const computePreviewStats = (plots: LandPlotData[]) => {
    const totalCadastrals = plots.filter((p) => (p.cadastral_number || "").trim()).length
    const totalListings = plots.filter((p) => !p.bundle_id || p.is_bundle_primary).length
    const leaseCount = plots.filter((p) => p.ownership_type === "lease").length
    return { totalCadastrals, totalListings, leaseCount }
  }

  const computeCadastralDiagnostics = (rows: LandPlotData[]) => {
    const counts = new Map<string, number>()
    let nonEmpty = 0
    let empty = 0

    for (const r of rows) {
      const cad = String(r.cadastral_number || "").trim()
      if (!cad) {
        empty++
        continue
      }
      nonEmpty++
      counts.set(cad, (counts.get(cad) || 0) + 1)
    }

    const duplicates = Array.from(counts.entries())
      .filter(([, c]) => c > 1)
      .map(([cadastral, count]) => ({ cadastral, count }))
      .sort((a, b) => b.count - a.count || a.cadastral.localeCompare(b.cadastral))

    const duplicateRows = duplicates.reduce((acc, d) => acc + (d.count - 1), 0)

    return {
      totalRows: rows.length,
      nonEmptyCadastralRows: nonEmpty,
      uniqueCadastrals: counts.size,
      duplicateRows,
      duplicates,
      emptyCadastralRows: empty,
    }
  }

  const handleGeneratePreview = async (opts?: {
    files?: File[]
    district?: string
    settlement?: string
    description?: string
  }) => {
    const files = opts?.files ?? selectedFiles
    const forcedDistrict = opts?.district
    const forcedSettlement = opts?.settlement
    const forcedDescription = opts?.description

    if (files.length === 0) {
      toast({
        title: "Файлы не выбраны",
        description: "Сначала выберите файл(ы) CSV/JSON/Excel/PDF для импорта.",
        variant: "destructive",
      })
      return
    }

    const settlementForImport = (forcedSettlement ?? selectedSettlement).trim()
    if (!settlementForImport && !autoResolve) {
      toast({
        title: "Не выбран населенный пункт",
        description: "Выберите район и населенный пункт, либо включите авто-определение адреса по кадастру.",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    setAllResults([])
    setImportProgress(0)
    setPreviewPlots(null)
    setPreviewReady(false)
    setPreviewCadDiagnostics(null)
    setLastPreviewError("")
    setLastImportError(null)

    try {
      let merged: LandPlotData[] = []
      setResolveProgressByCad({})
      setCoordsSourceByCad({})
      setNspdContourByCad({})

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setCurrentFileIndex(i)

        // 1) Parsing
        setImportStage(`Превью: разбор файла ${i + 1}/${files.length}...`)
        const rawData = await parseFileToData(file)
        setImportProgress(10 + (i / Math.max(1, files.length)) * 20)

        // 2) Formatting
        const mapped: LandPlotData[] = rawData.flatMap((row, rowIdx) => {
          const record = row as Record<string, unknown>

          const getCadFrom = (v: unknown) => String(v ?? "").trim()
          const cadColumns = [
            getCadFrom(record["КН1"] ?? (record as any)["KN1"]),
            getCadFrom(record["КН2"] ?? (record as any)["KN2"]),
            getCadFrom(record["КН3"] ?? (record as any)["KN3"]),
          ].filter(Boolean)

          const settlementFromRow = String(
            record["Населенный пункт"] ?? (record as any).location ?? (record as any).settlement ?? "",
          ).trim()

          const settlement = settlementFromRow || settlementForImport

          const district =
            (forcedDistrict && forcedDistrict !== "all")
              ? forcedDistrict
              : selectedDistrict !== "all"
                ? selectedDistrict
                : String(record["Район"] || record.district || "")

          const areaRaw =
            record["Площадь (сот.)"] ??
            record["Площадь"] ??
            record.area_sotok ??
            (record as any).area_sotka ??
            record.area
          let areaSotok = Number(areaRaw || 0)
          if (areaSotok > 100) {
            // If it's likely square meters (e.g. 1000), convert to sotok.
            areaSotok = Math.round((areaSotok / 100) * 10) / 10
          }

          const singleCadastral = String(record["Кадастровый номер"] || record.cadastral_number || "").trim()
          const price = Number(record["Цена (₽)"] || record["Цена"] || record.price || (record as any).price_rub || 0)

          let title = String(record["Заголовок"] || record.title || "")
          if (!title || title === "Без названия") {
            title = `Участок ${areaSotok} сот.${settlement ? `, ${settlement}` : ""}`
          }

          const bundleIdRaw = record.bundle_id ?? record["Bundle ID"] ?? record.bundle
          const bundleId = typeof bundleIdRaw === "string" && bundleIdRaw.trim() ? bundleIdRaw.trim() : undefined
          const bundleTitleRaw = record.bundle_title ?? record["Bundle Title"]
          const bundleTitle = typeof bundleTitleRaw === "string" && bundleTitleRaw.trim() ? bundleTitleRaw.trim() : undefined

          const isBundlePrimaryRaw = record.is_bundle_primary ?? record["Bundle Primary"]
          const isBundlePrimary =
            isBundlePrimaryRaw === true ||
            String(isBundlePrimaryRaw || "") === "1" ||
            String(isBundlePrimaryRaw || "").toLowerCase() === "true" ||
            String(isBundlePrimaryRaw || "").toLowerCase() === "yes" ||
            String(isBundlePrimaryRaw || "").toLowerCase() === "да"

          const centerLatRaw = record.center_lat ?? record["Center Lat"] ?? record["Широта"]
          const centerLonRaw = record.center_lon ?? record["Center Lon"] ?? record["Долгота"]
          const centerLat = centerLatRaw === undefined || centerLatRaw === null || String(centerLatRaw).trim() === "" ? undefined : Number(centerLatRaw)
          const centerLon = centerLonRaw === undefined || centerLonRaw === null || String(centerLonRaw).trim() === "" ? undefined : Number(centerLonRaw)
          const coordinatesJson = record.coordinates_json ?? record["Coordinates JSON"]
          const hasCoordinatesExplicit = record.has_coordinates === true || String(record.has_coordinates || "").toLowerCase() === "true"
          const hasCoordsFromFile =
            hasCoordinatesExplicit ||
            (typeof centerLat === "number" && !Number.isNaN(centerLat) && typeof centerLon === "number" && !Number.isNaN(centerLon)) ||
            (coordinatesJson !== undefined && coordinatesJson !== null && String(coordinatesJson).trim() !== "")

          const landStatus = String(record["Статус земли"] || record["Статус"] || record.land_status || "ИЖС")
          const ownershipTypeRaw = record["Форма владения"] ?? record.ownership_type
          const ownershipType =
            ownershipTypeRaw !== undefined
              ? normalizeOwnershipType(ownershipTypeRaw)
              : normalizeOwnershipType(landStatus)

          const leaseFromRaw = record["Аренда с"] ?? record.lease_from
          const leaseToRaw = record["Аренда по"] ?? record.lease_to
          const leaseFrom =
            leaseFromRaw === undefined || leaseFromRaw === null || String(leaseFromRaw).trim() === ""
              ? undefined
              : String(leaseFromRaw).trim()
          const leaseTo =
            leaseToRaw === undefined || leaseToRaw === null || String(leaseToRaw).trim() === ""
              ? undefined
              : String(leaseToRaw).trim()

          const base: Omit<LandPlotData, "cadastral_number" | "bundle_id" | "bundle_title" | "is_bundle_primary"> = {
            title,
            description: (forcedDescription ?? settlementDescription)?.trim() ? String((forcedDescription ?? settlementDescription)).trim() : "",
            price,
            area_sotok: areaSotok,
            district,
            location: settlement,
            land_status: landStatus,
            ownership_type: ownershipType,
            lease_from: leaseFrom,
            lease_to: leaseTo,
            is_reserved:
              record["Забронирован"] === true ||
              String(record["Забронирован"] || "").toLowerCase() === "да" ||
              String(record.is_reserved || "").toLowerCase() === "true",
            coordinates_json: coordinatesJson as any,
            center_lat: typeof centerLat === "number" && !Number.isNaN(centerLat) ? centerLat : undefined,
            center_lon: typeof centerLon === "number" && !Number.isNaN(centerLon) ? centerLon : undefined,
            has_coordinates: hasCoordsFromFile ? true : undefined,
            has_gas: record["Газ"] === "Да" || record["Газ"] === "да" || record["Газ"] === true,
            has_electricity:
              record["Электричество"] === "Да" || record["Электричество"] === "да" || record["Электричество"] === true,
            has_water: record["Вода"] === "Да" || record["Вода"] === "да" || record["Вода"] === true,
            has_installment: record["Рассрочка"] === "Да" || record["Рассрочка"] === "да" || record["Рассрочка"] === true,
          }

          const cadastrals = cadColumns.length > 0 ? cadColumns : (singleCadastral ? [singleCadastral] : [])
          const needsBundle = cadastrals.length > 1
          const resolvedBundleId = needsBundle
            ? bundleId || `import-${Date.now()}-${i}-${rowIdx}`
            : bundleId

          return cadastrals.map((cad, idx) => ({
            ...base,
            cadastral_number: cad,
            bundle_id: resolvedBundleId,
            bundle_title: needsBundle ? (bundleTitle || title) : bundleTitle,
            is_bundle_primary: needsBundle ? idx === 0 : (isBundlePrimary || undefined),
            price: needsBundle ? (idx === 0 ? price : 0) : price,
          }))
        })

        // 3) Address Resolution (optional)
        let plots = mapped
        if (autoResolve) {
          setResolveProgressByCad(prev => {
            const next = { ...prev }
            for (const p of plots) {
              const cad = String(p.cadastral_number || "").trim()
              if (!cad) continue
              next[cad] = next[cad] || { percent: 0, status: "pending" }
            }
            return next
          })
          setCoordsSourceByCad(prev => {
            const next = { ...prev }
            for (const p of plots) {
              const cad = String(p.cadastral_number || "").trim()
              if (!cad) continue
              const hasCoords =
                p.has_coordinates ||
                (typeof p.center_lat === "number" && typeof p.center_lon === "number") ||
                p.coordinates_json
              next[cad] = hasCoords ? "file" : "none"
            }
            return next
          })
          setImportStage(`Превью: определение адресов (${i + 1}/${files.length})...`)
          plots = await resolveAddressesForPlots(plots, (p, msg) => {
            setImportProgress(30 + (p * 0.6))
            setImportStage(msg)
          })
        }

        merged = merged.concat(plots)
      }

      setImportStage("Превью: группировка bundle...")
      const normalized = normalizeBundlesForPreview(merged)

      setPreviewCadDiagnostics(computeCadastralDiagnostics(merged))

      const summary = computeLotSummary(normalized)
      console.log(`[v0] Обнаружено лотов: ${summary.lots}`)
      console.log(`[v0] Обнаружено одиночных участков: ${summary.singles}`)
      console.log(`[v0] Итого кадастровых номеров на импорт: ${summary.total}`)

      setPreviewPlots(normalized)
      setPreviewReady(true)
      setImportProgress(100)
      setImportStage("Превью готово")
      setShowSettlementDialog(false)
      setShowPreviewDialog(true)
    } catch (error) {
      console.error("[handleGeneratePreview] Error:", error)
      const msg = formatErrorText(error)
      const details = formatErrorDetails(error)
      setLastPreviewError(msg)
      toast({
        title: "Ошибка подготовки превью",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      setCurrentFileIndex(-1)
      // keep progress values so user can read them in dialog
    }
  }

  const handleRunImport = async () => {
    if (!previewReady || !previewPlots || previewPlots.length === 0) return

    setIsImporting(true)
    setAllResults([])
    setImportProgress(0)
    setShowImportProgressDialog(true)
    setLastImportError(null)

    // Reset per-cadastral progress so we don't show old preview resolve state during import.
    setResolveProgressByCad(() => {
      const next: Record<string, { percent: number; status: "pending" | "resolving" | "resolved" | "error" | "skipped" }> = {}
      for (const p of previewPlots) {
        const cad = String(p.cadastral_number || "").trim()
        if (!cad) continue
        next[cad] = { percent: 0, status: "pending" }
      }
      return next
    })
    setImportDetailByCad(() => {
      const next: Record<string, { status: string; message: string }> = {}
      for (const p of previewPlots) {
        const cad = String(p.cadastral_number || "").trim()
        if (!cad) continue
        next[cad] = { status: "pending", message: "Ожидание" }
      }
      return next
    })

    try {
      const uniqueLocations = Array.from(
        new Set(
          previewPlots
            .map((p) => String(p.location || "").trim())
            .filter(Boolean),
        ),
      )

      const settlementForSync = uniqueLocations.length > 1
        ? "__MULTI__"
        : (selectedSettlement || previewPlots[0]?.location || "")

      const logData = {
        fileName: selectedFiles.map((f) => f.name).join(", "),
        fileType: selectedFiles.length > 1 ? "multi" : (selectedFiles[0]?.name.split(".").pop()?.toLowerCase() || "unknown"),
      }

      setImportStage("Импорт: запуск...")
      setImportProgress(1)

      const resp = await fetch("/api/land-plots/import-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landPlotsData: previewPlots,
          settlement: settlementForSync,
          replaceAll: false,
          autoResolve: false,
          logData,
        }),
      })

      if (!resp.ok || !resp.body) {
        const txt = await resp.text().catch(() => "")
        const msg = txt?.trim() ? txt.trim() : `Import stream failed: ${resp.status} ${resp.statusText || ""}`.trim()
        const details = txt && txt.trim() ? txt : ""
        setLastImportError({ title: "Ошибка импорта", message: msg, details })
        throw new Error(msg)
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const total = previewPlots.length
      let processed = 0

      const summary: SyncResult = {
        success: true,
        message: "",
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [],
        details: [],
      }

      const statusFromOperation = (op: string) => {
        if (op === "added" || op === "updated" || op === "archived") return "resolved" as const
        if (op === "skipped") return "skipped" as const
        return "error" as const
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (!line) continue

          let evt: any
          try {
            evt = JSON.parse(line)
          } catch {
            continue
          }

          if (evt?.type === "start") {
            setImportStage("Импорт: обработка...")
            setImportProgress(1)
            continue
          }

          if (evt?.type === "batch") {
            if (typeof evt.processed === "number") processed = evt.processed
            const pct = total > 0 ? Math.round((processed / total) * 100) : 0
            setImportProgress(Math.min(99, Math.max(1, pct)))
            continue
          }

          if (evt?.type === "detail" && evt.detail) {
            const d = evt.detail as { status: string; cadastral: string; message: string }

            summary.details.push({
              line: Number((evt.detail as any).line || 0),
              status: d.status as any,
              message: d.message,
              cadastral: d.cadastral,
            })

            if (d.status === "added") summary.added++
            else if (d.status === "updated") summary.updated++
            else if (d.status === "archived") summary.deleted++
            else if (d.status === "error") summary.errors.push(d.message)

            if (typeof evt.processed === "number") processed = evt.processed
            const pct = total > 0 ? Math.round((processed / total) * 100) : 0
            setImportProgress(Math.min(99, Math.max(1, pct)))

            const cad = String(d.cadastral || "").trim()
            if (cad) {
              setResolveProgressByCad((prev) => ({
                ...prev,
                [cad]: { percent: 100, status: statusFromOperation(d.status) },
              }))

              setImportDetailByCad((prev) => ({
                ...prev,
                [cad]: { status: d.status, message: String(d.message || "") },
              }))
            }
            continue
          }

          if (evt?.type === "summary" && evt.summary) {
            summary.success = Boolean(evt.summary.success)
            summary.message = String(evt.summary.message || "")
            continue
          }

          if (evt?.type === "error") {
            summary.success = false
            const emsg = String(evt.message || "Ошибка импорта")
            summary.errors.push(emsg)
            setLastImportError({ title: "Ошибка импорта", message: emsg, details: JSON.stringify(evt, null, 2) })
            setImportStage(`Ошибка: ${emsg}`)
          }
        }
      }

      setImportProgress(100)
      setImportStage("Импорт завершен")
      setAllResults([summary])

      onImport?.(summary)
      toast({
        title: summary.success ? "Импорт завершен" : "Импорт завершен с ошибками",
        description: `Добавлено: ${summary.added}, обновлено: ${summary.updated}, архивировано: ${summary.deleted}, ошибок: ${summary.errors.length}`,
      })
    } catch (error) {
      console.error("[handleRunImport] Error:", error)
      const msg = formatErrorText(error)
      const details = formatErrorDetails(error)
      if (!lastImportError) {
        setLastImportError({ title: "Ошибка импорта", message: msg, details: details || undefined })
      }
      toast({
        title: "Ошибка импорта",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      // keep progress/stage so user can read them in the dialog
    }
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      const result = await exportLandPlotsToJSON()

      if (!result.success || !result.data) {
        throw new Error(result.error || "Ошибка экспорта")
      }

      const headers = Object.keys(result.data[0])
      const csvRows = [
        headers.join(","),
        ...result.data.map((row) =>
          headers
            .map((header) => {
              const value = row[header]
              const stringValue = String(value ?? "")
              return stringValue.includes(",") || stringValue.includes('"')
                ? `"${stringValue.replace(/"/g, '""')}"`
                : stringValue
            })
            .join(","),
        ),
      ]
      const csvContent = csvRows.join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `участки_${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert(`Ошибка экспорта: ${error}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Импорт участков
          </CardTitle>
          <CardDescription>Импорт и синхронизация участков по выбранному поселку</CardDescription>
          <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                <Info className="mr-2 h-4 w-4" />
                {showInstructions ? "Скрыть инструкцию" : "Показать форматы файлов"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div>
                    <strong className="font-semibold">Поддерживаемые форматы:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>
                        <strong>PDF</strong> - Импорт участков одного поселка. Система распознает текст и предложит выбрать поселок.
                      </li>
                      <li>
                        <strong>CSV/Excel/JSON</strong> - Сопоставление и синхронизация. Участки из файла обновляются/добавляются.
                        Если участок есть в базе, но отсутствует в файле (в выбранном поселке) — он будет помечен как архивный.
                      </li>
                      <li>
                        <strong>Лоты (bundle)</strong> - задаются через поля <strong>Bundle ID</strong> / <strong>Bundle Primary</strong>.
                        Цена указывается только у primary-строки, остальные участки лота могут иметь цену 0.
                      </li>
                      <li>
                        <strong>Аренда</strong> - задается как <strong>Форма владения = Аренда</strong> (или ownership_type=lease) и датами
                        <strong>Аренда с</strong> / <strong>Аренда по</strong> (lease_from/lease_to).
                      </li>
                    </ul>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={downloadCSVTemplate}>
                      <Download className="mr-2 h-3 w-3" />
                      Скачать шаблон CSV
                    </Button>
                    <Button size="sm" variant="secondary" onClick={downloadJSONTemplate}>
                      <Download className="mr-2 h-3 w-3" />
                      Скачать шаблон JSON
                    </Button>
                    <Button variant="outline" onClick={downloadExcelTemplate} className="w-full bg-transparent">
                      <Download className="mr-2 h-4 w-4" />
                      Скачать шаблон Excel
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              disabled={isImporting}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? `Загрузка... (${currentFileIndex + 1}/${selectedFiles.length})` : "Выбрать файлы для импорта"}
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".csv,.json,.pdf,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                  Экспортируется...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Экспортировать в CSV
                </>
              )}
            </Button>
          </div>

          {/* Step 1: Settlement + options */}
          <Dialog
            open={showSettlementDialog}
            onOpenChange={(open) => {
              if (isImporting) return
              setShowSettlementDialog(open)
            }}
          >
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Выберите населенный пункт</DialogTitle>
                <DialogDescription>
                  {detectedSettlement && (
                    <span className="text-sm text-muted-foreground">
                      Обнаружен в файле: <strong>{detectedSettlement}</strong>
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Район</Label>
                  <AddressCombobox
                    value={selectedDistrict === "all" ? "" : selectedDistrict}
                    onValueChange={(value) => void handleDistrictChange(value || "all")}
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
                    value={selectedSettlement}
                    onValueChange={(value) => setSelectedSettlement(value)}
                    options={settlements.map((s) => ({ id: s.id, name: s.name }))}
                    placeholder={!selectedDistrict || selectedDistrict === "all" ? "Сначала выберите район" : "Выберите населенный пункт"}
                    searchPlaceholder="Поиск населенного пункта..."
                    emptyText="Населенный пункт не найден"
                    disabled={!selectedDistrict || selectedDistrict === "all"}
                    loading={loadingAddresses}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Описание</Label>
                  <RadioGroup
                    value={descriptionMode}
                    onValueChange={(v) => setDescriptionMode(v as "saved" | "manual")}
                    className="grid gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="saved" id="desc-mode-saved" />
                      <Label htmlFor="desc-mode-saved">Использовать сохраненное описание</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="manual" id="desc-mode-manual" />
                      <Label htmlFor="desc-mode-manual">Ввести вручную</Label>
                    </div>
                  </RadioGroup>

                  <Textarea
                    value={settlementDescription}
                    onChange={(e) => setSettlementDescription(e.target.value)}
                    placeholder="Введите описание, которое будет применено ко всем участкам этого поселка"
                    className="rounded-xl min-h-24 max-h-60 overflow-y-auto resize-y"
                    disabled={descriptionMode === "saved"}
                  />

                  {descriptionMode === "saved" && (
                    <div className="text-xs text-muted-foreground">
                      {savedSettlementDescription?.trim()
                        ? "Подставлено сохраненное описание. Для изменения выберите «Ввести вручную» или обновите описание в блоке выше."
                        : "Для выбранного поселка нет сохраненного описания. Выберите «Ввести вручную» или создайте описание в блоке выше."}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <input
                    type="checkbox"
                    id="auto-resolve"
                    checked={autoResolve}
                    onChange={(e) => setAutoResolve(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <Label htmlFor="auto-resolve" className="text-sm font-medium cursor-pointer">
                    Автоматически определять адрес по кадастру (НСПД + КЛАДР)
                  </Label>
                </div>

                {isImporting && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-xl border">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-primary">{importStage || "Импорт..."}</span>
                      <span className="text-muted-foreground font-mono">{Math.round(importProgress)}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Файл {currentFileIndex + 1} из {selectedFiles.length}
                    </div>
                  </div>
                )}

                {!!lastPreviewError && !isImporting && (
                  <Alert className="border-red-200 bg-red-50/40 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="space-y-2">
                      <div className="text-sm">{lastPreviewError}</div>
                    </AlertDescription>
                  </Alert>
                )}

                {lastImportError && !isImporting && (
                  <Alert className="border-red-200 bg-red-50/40 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="space-y-2">
                      <div className="text-sm font-medium">{lastImportError.title}</div>
                      <div className="text-sm">{lastImportError.message}</div>
                      {!!lastImportError.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer select-none">Детали</summary>
                          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-white/60 p-2 text-[11px] leading-snug text-red-900">
                            {lastImportError.details}
                          </pre>
                        </details>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter className="shrink-0">
                <Button type="button" variant="outline" onClick={() => setShowSettlementDialog(false)} disabled={isImporting}>
                  Отмена
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleGeneratePreview()}
                  disabled={isImporting || (!autoResolve && (selectedDistrict === "all" || !selectedSettlement))}
                >
                  Сгенерировать превью
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Step 2: Preview / analysis dialog */}
          <Dialog
            open={showPreviewDialog}
            onOpenChange={(open) => {
              if (isImporting) return
              setShowPreviewDialog(open)
            }}
          >
            <DialogContent className="sm:max-w-[980px] max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>Анализ импорта</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setShowPreviewDialog(false)}
                    disabled={isImporting}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </DialogTitle>
                <DialogDescription>
                  Проверьте список участков/лотов. Данные в БД не записываются до нажатия «Запустить импорт».
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {!previewReady || !previewPlots ? (
                  <div className="space-y-3">
                    <div className="space-y-3 p-4 bg-muted/50 rounded-xl border">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-primary">{importStage || "Подготовка превью..."}</span>
                        <span className="text-muted-foreground font-mono">{Math.round(importProgress)}%</span>
                      </div>
                      <Progress value={importProgress} className="h-2" />
                    </div>

                    {!!lastPreviewError && !isImporting && (
                      <Alert className="border-red-200 bg-red-50/40 text-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="space-y-2">
                          <div className="text-sm">{lastPreviewError}</div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {lastImportError && !isImporting && (
                      <Alert className="border-red-200 bg-red-50/40 text-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="space-y-2">
                          <div className="text-sm font-medium">{lastImportError.title}</div>
                          <div className="text-sm">{lastImportError.message}</div>
                          {!!lastImportError.details && (
                            <details className="text-xs">
                              <summary className="cursor-pointer select-none">Детали</summary>
                              <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-white/60 p-2 text-[11px] leading-snug text-red-900">
                                {lastImportError.details}
                              </pre>
                            </details>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {Object.keys(resolveProgressByCad || {}).length > 0 && (
                      <div className="border rounded-xl overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 bg-muted/50 px-3 py-2 text-xs font-medium">
                          <div className="col-span-4">Кадастр</div>
                          <div className="col-span-3">Прогресс</div>
                          <div className="col-span-5">Статус</div>
                        </div>
                        <div className="max-h-[360px] overflow-y-auto">
                          {Object.entries(resolveProgressByCad).map(([cad, st]) => {
                            const contour = nspdContourByCad[cad]
                            const src = coordsSourceByCad[cad]
                            const srcLabel = src === "file" ? "Файл" : src === "nspd" ? "НСПД" : "—"
                            const statusLabel =
                              st.status === "pending"
                                ? "Ожидание"
                                : st.status === "resolving"
                                  ? "Определение адреса"
                                  : st.status === "resolved"
                                    ? "Готово"
                                    : "Ошибка"
                            return (
                              <div key={cad} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-b last:border-b-0">
                                <div className="col-span-4 font-mono text-xs text-muted-foreground truncate">{cad}</div>
                                <div className="col-span-3">
                                  <div className="flex items-center gap-2">
                                    <Progress value={typeof st.percent === "number" ? st.percent : 0} className="h-2" />
                                    <div className="text-[10px] text-muted-foreground w-10 text-right">
                                      {typeof st.percent === "number" ? `${st.percent}%` : "—"}
                                    </div>
                                  </div>
                                </div>
                                <div className="col-span-5">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{statusLabel}</span>
                                    {st.status === "resolving" && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {st.status === "error" && <AlertCircle className="h-3 w-3 text-red-600" />}
                                    <span className="mx-1 text-muted-foreground">|</span>
                                    <span>{srcLabel}</span>
                                    {typeof contour === "boolean" ? (
                                      contour ? (
                                        <Shapes className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Shapes className="h-3 w-3 text-red-600" />
                                      )
                                    ) : (
                                      <Shapes className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {(() => {
                      const stats = computePreviewStats(previewPlots)
                      const lotSummary = computeLotSummary(previewPlots)
                      return (
                        <div className="grid gap-2 text-sm">
                          <div>
                            Будет загружено кадастровых номеров: <strong>{lotSummary.total}</strong>
                          </div>
                          <div>
                            Лотов: <strong>{lotSummary.lots}</strong>
                          </div>
                          <div>
                            Одиночных участков: <strong>{lotSummary.singles}</strong>
                          </div>
                          <div>
                            Итого объявлений на сайте: <strong>{stats.totalListings}</strong>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="border rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 bg-muted/50 px-3 py-2 text-xs font-medium">
                        <div className="col-span-3">Кадастр</div>
                        <div className="col-span-3">Посёлок</div>
                        <div className="col-span-2">Лот</div>
                        <div className="col-span-2">НСПД</div>
                        <div className="col-span-2 text-right">Цена</div>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto">
                        {(() => {
                          let lastBundle: string | undefined
                          return previewPlots.map((p, idx) => {
                            const isNewBundle = !!p.bundle_id && p.bundle_id !== lastBundle
                            if (p.bundle_id) lastBundle = p.bundle_id

                            const cad = String(p.cadastral_number || "").trim()
                            const st = cad ? resolveProgressByCad[cad] : undefined
                            const src = cad ? coordsSourceByCad[cad] : undefined
                            const contour = cad ? nspdContourByCad[cad] : undefined

                            const srcLabel = src === "file" ? "Файл" : src === "nspd" ? "НСПД" : "—"
                            const saleLabel = !p.bundle_id ? "—" : p.is_bundle_primary ? "Лот (primary)" : "Лот"

                            const hasCoords =
                              p.has_coordinates ||
                              (typeof p.center_lat === "number" && typeof p.center_lon === "number") ||
                              p.coordinates_json

                            return (
                              <div key={`${p.cadastral_number}-${idx}`}>
                                {isNewBundle && (
                                  <div className="px-3 py-2 bg-muted/30 text-xs font-medium border-b">
                                    {p.bundle_title || `Лот: ${p.bundle_id}`}
                                  </div>
                                )}
                                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-b last:border-b-0">
                                  <div className="col-span-3 font-mono text-xs text-muted-foreground truncate">{p.cadastral_number}</div>
                                  <div className="col-span-3 truncate">{p.location || "—"}</div>
                                  <div className="col-span-2 text-xs text-muted-foreground">{saleLabel}</div>
                                  <div className="col-span-2">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {hasCoords ? (
                                          <MapPin className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <MapPinOff className="h-3 w-3 text-red-600" />
                                        )}
                                        <span>{srcLabel}</span>
                                        {typeof contour === "boolean" ? (
                                          contour ? (
                                            <Shapes className="h-3 w-3 text-green-600" />
                                          ) : (
                                            <Shapes className="h-3 w-3 text-red-600" />
                                          )
                                        ) : (
                                          <Shapes className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        {st?.status === "error" && <AlertCircle className="h-3 w-3 text-red-600" />}
                                        {st?.status === "resolving" && <Loader2 className="h-3 w-3 animate-spin" />}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-span-2 text-right font-medium">
                                    {new Intl.NumberFormat("ru-RU").format(Number(p.price || 0))} ₽
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="shrink-0">
                <Button type="button" variant="outline" className="bg-transparent" disabled={isImporting} onClick={resetImportFlow}>
                  Сбросить
                </Button>
                <Button type="button" disabled={isImporting || !previewReady} onClick={handleRunImport}>
                  Запустить импорт
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Step 3: Import progress dialog */}
          <Dialog
            open={showImportProgressDialog}
            onOpenChange={(open) => {
              if (isImporting) return
              setShowImportProgressDialog(open)
            }}
          >
            <DialogContent className="sm:max-w-[850px] max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Импорт: прогресс</DialogTitle>
                <DialogDescription>
                  Общий прогресс и статус по каждому кадастровому номеру.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2 p-4 bg-muted/50 rounded-xl border">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-primary">{importStage || (isImporting ? "Импорт..." : "Готово")}</span>
                    <span className="text-muted-foreground font-mono">{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 bg-muted/50 px-3 py-2 text-xs font-medium">
                    <div className="col-span-4">Кадастр</div>
                    <div className="col-span-3">Прогресс</div>
                    <div className="col-span-5">Импорт</div>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {(previewPlots || []).map((p, idx) => {
                      const cad = String(p.cadastral_number || "").trim()
                      const st = cad ? resolveProgressByCad[cad] : undefined
                      const imp = cad ? importDetailByCad[cad] : undefined

                      const label =
                        imp?.status === "added"
                          ? "Добавлен"
                          : imp?.status === "updated"
                            ? "Обновлен"
                            : imp?.status === "archived"
                              ? "Архивирован"
                              : imp?.status === "skipped"
                                ? "Пропущен"
                                : imp?.status === "error"
                                  ? "Ошибка"
                                  : "Ожидание"

                      return (
                        <div key={`${cad}-${idx}`} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-b last:border-b-0">
                          <div className="col-span-4 font-mono text-xs text-muted-foreground truncate">{cad || "—"}</div>
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <Progress value={typeof st?.percent === "number" ? st.percent : 0} className="h-2" />
                              <div className="text-[10px] text-muted-foreground w-10 text-right">
                                {typeof st?.percent === "number" ? `${st.percent}%` : "—"}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className={cn(
                                imp?.status === "error" ? "text-red-600" :
                                  imp?.status === "added" ? "text-green-600" :
                                    imp?.status === "updated" ? "text-blue-600" :
                                      "text-muted-foreground"
                              )}>
                                {label}
                              </span>
                              {imp?.status === "error" && <AlertCircle className="h-3 w-3 text-red-600" />}
                              {isImporting && (!imp || imp.status === "pending") && <Loader2 className="h-3 w-3 animate-spin" />}
                              {imp?.message && (
                                <span className="truncate">{imp.message}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0">
                <Button type="button" variant="outline" className="bg-transparent" onClick={() => setShowImportProgressDialog(false)} disabled={isImporting}>
                  Закрыть
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {allResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Результаты импорта ({allResults.length} файлов)
              </h3>

              <div className="space-y-3">
                {allResults.map((res, fileIdx) => (
                  <div key={fileIdx} className={cn(
                    "border rounded-xl p-4 transition-all",
                    res.success ? "bg-green-50/30 border-green-100" : "bg-red-50/30 border-red-100"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Файл #{fileIdx + 1}</span>
                        {!res.success && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {res.added} добавлено, {res.updated} обновлено
                      </div>
                    </div>

                    <div className="text-sm mb-3">
                      {res.message}
                    </div>

                    {res.details && res.details.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 hover:bg-black/5">
                            Показать детали ({res.details.length})
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 pl-4 border-l-2 border-primary/10 space-y-1">
                          {res.details.map((log, logIdx) => (
                            <div key={logIdx} className="text-xs flex items-center gap-2 py-0.5">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                log.status === "added" ? "bg-green-500" :
                                  log.status === "updated" ? "bg-blue-500" : "bg-red-500"
                              )} />
                              <span className="font-mono text-[10px] text-muted-foreground min-w-[100px]">{log.cadastral}</span>
                              <span className="truncate">{log.message}</span>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function parseCSV(text: string): Array<Record<string, unknown>> {
  const lines = text.trim().split("\n")
  const headers = lines[0].split(",").map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const values = line.split(",")
    const row: Record<string, unknown> = {}
    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() || ""
    })
    return row
  })
}

async function parsePDF(file: File): Promise<{
  plots: Array<Record<string, unknown>>
  settlement: string
}> {
  try {
    console.log("[v0] Loading PDF.js library...")
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs`
    console.log("[v0] PDF.js worker configured")

    const arrayBuffer = await file.arrayBuffer()
    console.log("[v0] File loaded into memory:", arrayBuffer.byteLength, "bytes")

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    console.log("[v0] PDF document loaded. Pages:", pdf.numPages)

    let fullText = ""

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`[v0] Extracting text from page ${i}/${pdf.numPages}...`)
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(" ")
      fullText += pageText + " "
      console.log(`[v0] Page ${i} text length:`, pageText.length, "chars")
    }

    console.log("[v0] Total extracted text length:", fullText.length, "chars")
    console.log("[v0] First 500 chars:", fullText.substring(0, 500))

    let defaultLocation = ""
    let defaultDistrict = ""

    const locationMatch = fullText.match(
      /(?:Пос\.|пос\.|поселок|Поселок|п\.|п\s)\s*([^,\d]+?)(?:\s+(?:Гурьевский|Зеленоградский|Багратионовский|Светлогорский|район)|,)/i,
    )
    if (locationMatch) {
      defaultLocation = "пос. " + locationMatch[1].trim()
      console.log("[v0] Extracted location:", defaultLocation)
    }

    const districtMatch = fullText.match(/(Гурьевский|Зеленоградский|Багратионовский|Светлогорский)\s+район/i)
    if (districtMatch) {
      defaultDistrict = districtMatch[1] + " район"
      console.log("[v0] Extracted district:", defaultDistrict)
    }

    const cadastralPattern = /(\d{2}:\d{2}:\d{6,7}:\d{3,4})/g
    const matches = [...fullText.matchAll(cadastralPattern)]
    console.log("[v0] Found", matches.length, "cadastral numbers in text")

    const fullTextLower = fullText.toLowerCase()
    const bundleMode =
      fullTextLower.includes("продаются вместе") ||
      fullTextLower.includes("продажа вместе") ||
      fullTextLower.includes("одним лотом") ||
      fullTextLower.includes("одним лот") ||
      fullTextLower.includes("вместе")

    let bundleId: string | undefined
    let bundleTitle: string | undefined
    let sharedPrice = 0

    if (bundleMode && matches.length > 1) {
      const firstCad = matches[0]?.[1]
      bundleId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${firstCad}-bundle`

      const sharedPriceMatch = fullText.match(/цена\s+([\d.,\s]+)\s*р/i)
      if (sharedPriceMatch) {
        const priceStr = sharedPriceMatch[1].replace(/[\s.]/g, "").replace(",", ".")
        sharedPrice = Number.parseInt(priceStr, 10) || 0
      }

      const locationForTitle = defaultLocation.trim()
      bundleTitle = `Лот из ${matches.length} участков${locationForTitle ? ` (${locationForTitle})` : ""}`
      console.log("[v0] Bundle detected in PDF:", { bundleId, bundleTitle, sharedPrice })
    }

    const plots: Array<Record<string, unknown>> = []
    const details: Array<{ line: number; cadastralNumber: string; status: string; details: string }> = []

    for (let i = 0; i < matches.length; i++) {
      const cadastralNumber = matches[i][1]
      const startIndex = matches[i].index!
      const endIndex = i < matches.length - 1 ? matches[i + 1].index! : fullText.length
      const plotText = fullText.substring(startIndex, endIndex)

      console.log(`[v0] Processing plot ${i + 1}/${matches.length}: ${cadastralNumber}`)

      try {
        const areaMatch = plotText.match(/площадь\s+([\d.,]+)\s+кв\.?\s*м/i)
        const areaSqM = areaMatch ? Number.parseFloat(areaMatch[1].replace(",", ".")) : 0
        const areaSotok = areaSqM > 0 ? Math.round((areaSqM / 100) * 10) / 10 : 0

        const priceMatch = plotText.match(/цена\s+([\d.,\s]+)\s*р/i)
        let price = 0
        if (priceMatch) {
          const priceStr = priceMatch[1].replace(/[\s.]/g, "")
          price = Number.parseInt(priceStr, 10)
        }

        if (bundleId && sharedPrice > 0) {
          price = i === 0 ? sharedPrice : 0
        }

        const isRent = plotText.toLowerCase().includes("аренда")
        const ownershipType = isRent ? "lease" : "ownership"

        if (areaSotok > 0 && (price > 0 || (bundleId && sharedPrice > 0))) {
          const plotData = {
            "Населенный пункт": defaultLocation,
            "Цена (₽)": price,
            "Площадь (сот.)": areaSotok,
            Район: defaultDistrict,
            "Статус земли": "ИЖС",
            "Кадастровый номер": cadastralNumber,
            "Форма владения": ownershipType,
            bundle_id: bundleId,
            bundle_title: bundleTitle,
            is_bundle_primary: bundleId ? i === 0 : undefined,
            Описание: `Участок ${areaSotok} сот., кадастровый номер ${cadastralNumber}`,
            Газ: "Нет",
            Электричество: "Нет",
            Вода: "Нет",
            Рассрочка: "Нет",
          }

          plots.push(plotData)
          details.push({
            line: i + 1,
            cadastralNumber: cadastralNumber,
            status: "success",
            details: `Добавлен участок ${areaSotok} сот., ${price} ₽`,
          })
          console.log(`[v0] Added plot ${i + 1}:`, plotData)
        } else {
          details.push({
            line: i + 1,
            cadastralNumber: cadastralNumber,
            status: "error",
            details: `Не удалось извлечь данные (площадь: ${areaSotok}, цена: ${price})`,
          })
          console.warn(`[v0] Skipped plot ${i + 1}: insufficient data`)
        }
      } catch (error) {
        console.error(`[v0] Error processing plot ${i + 1}:`, error)
        details.push({
          line: i + 1,
          cadastralNumber: cadastralNumber,
          status: "error",
          details: `Ошибка парсинга: ${error}`,
        })
      }
    }

    console.log("[v0] Total plots extracted:", plots.length)
    return {
      plots,
      settlement: defaultLocation,
    }
  } catch (error) {
    console.error("[v0] PDF parsing error:", error)
    throw new Error(`Ошибка парсинга PDF: ${error}`)
  }
}

export default LandPlotImporter
