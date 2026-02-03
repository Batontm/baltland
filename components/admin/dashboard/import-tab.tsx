"use client"

import { LandPlotImporter } from "@/components/admin/land-plot-importer"
import { ImportLogsViewer } from "@/components/admin/import-logs-viewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useEffect, useState } from "react"
import { clearAllLandPlots, clearLandPlotsBySettlement, getSettlementPlotCounts } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
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

interface ImportTabProps {
  onRefresh: () => void
}

export function ImportTab({ onRefresh }: ImportTabProps) {
  const { toast } = useToast()
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [clearingKey, setClearingKey] = useState<string | null>(null)
  const [settlementCounts, setSettlementCounts] = useState<
    Array<{ district: string | null; settlement: string | null; count: number }>
  >([])
  const [confirmingRow, setConfirmingRow] = useState<{
    district: string | null
    settlement: string | null
    count: number
  } | null>(null)
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)

  const loadCounts = async () => {
    setLoadingCounts(true)
    try {
      const rows = await getSettlementPlotCounts()
      setSettlementCounts(rows)
    } finally {
      setLoadingCounts(false)
    }
  }

  useEffect(() => {
    void loadCounts()
  }, [])

  return (
    <div className="space-y-6">

      <Accordion type="single" collapsible defaultValue="import" className="rounded-2xl border bg-white">
        <AccordionItem value="import">
          <AccordionTrigger className="px-6">Импорт участков</AccordionTrigger>
          <AccordionContent className="px-6">
            <LandPlotImporter onImport={onRefresh} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="history">
          <AccordionTrigger className="px-6">История импорта</AccordionTrigger>
          <AccordionContent className="px-6">
            <ImportLogsViewer />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cleanup">
          <AccordionTrigger className="px-6">Очистка по поселкам</AccordionTrigger>
          <AccordionContent className="px-6">
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Очистка по поселкам</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 rounded-xl"
                  disabled={clearingAll || loadingCounts || settlementCounts.length === 0}
                  onClick={() => setShowClearAllDialog(true)}
                >
                  Очистить всё
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingCounts ? (
                  <div className="text-sm text-muted-foreground">Загрузка...</div>
                ) : settlementCounts.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Поселков не найдено</div>
                ) : (
                  <div className="space-y-2">
                    {settlementCounts.map((row) => {
                      const key = `${row.district || ""}||${row.settlement || ""}`
                      return (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <div className="text-sm">
                            <span className="font-medium">{row.settlement}</span>
                            <span className="text-muted-foreground"> — {row.count} участков</span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-xl"
                            disabled={clearingKey === key}
                            onClick={() => setConfirmingRow(row)}
                          >
                            Очистить
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить ВСЕ участки?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие удалит абсолютно все участки из базы данных во всех поселках.
              Это необратимое действие. Вы уверены?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={clearingAll}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-xl"
              disabled={clearingAll}
              onClick={async (e) => {
                e.preventDefault()
                setClearingAll(true)
                try {
                  const res = await clearAllLandPlots()
                  toast({
                    title: res.success ? "База очищена" : "Ошибка очистки",
                    description: res.message,
                    variant: res.success ? "default" : "destructive",
                  })
                  await loadCounts()
                  onRefresh()
                  setShowClearAllDialog(false)
                } finally {
                  setClearingAll(false)
                }
              }}
            >
              {clearingAll ? "Удаление..." : "Удалить всё"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmingRow} onOpenChange={(open) => !open && setConfirmingRow(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить поселок?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите очистить поселок "{confirmingRow?.settlement}"?
              Будут удалены все участки ({confirmingRow?.count} шт.) в этом поселке.
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="rounded-xl"
              onClick={async () => {
                if (!confirmingRow?.settlement) return
                const district = confirmingRow.district || "all"
                const settlement = confirmingRow.settlement
                const key = `${confirmingRow.district || ""}||${confirmingRow.settlement || ""}`

                setClearingKey(key)
                try {
                  const res = await clearLandPlotsBySettlement(district, settlement)
                  toast({
                    title: res.success ? "Очистка выполнена" : "Ошибка очистки",
                    description: res.message,
                    variant: res.success ? "default" : "destructive",
                  })
                  await loadCounts()
                  onRefresh()
                } finally {
                  setClearingKey(null)
                  setConfirmingRow(null)
                }
              }}
            >
              Очистить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
