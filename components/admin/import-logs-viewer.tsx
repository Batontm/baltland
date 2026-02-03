"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, FileText, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface ImportLog {
  id: string
  imported_at: string
  settlement: string
  file_name: string
  file_type: string
  added_count: number
  updated_count: number
  archived_count: number
  details: Array<{
    cadastral_number: string
    operation: "added" | "updated" | "archived" | "error" | "skipped"
    settlement: string
    message?: string
  }>
}

export function ImportLogsViewer() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(false)
  const [datesWithLogs, setDatesWithLogs] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    loadLogDates()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      loadLogsForDate(selectedDate)
    }
  }, [selectedDate])

  const loadLogDates = async () => {
    try {
      const response = await fetch("/api/import-logs/dates")
      const data = await response.json()
      setDatesWithLogs(new Set(data.dates))
    } catch (error) {
      console.error("[v0] Error loading log dates:", error)
    }
  }

  const loadLogsForDate = async (date: Date) => {
    setLoading(true)
    try {
      const formattedDate = format(date, "yyyy-MM-dd")
      const response = await fetch(`/api/import-logs?date=${formattedDate}`)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("[v0] Error loading logs:", error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const displayedLogs = isExpanded ? logs : logs.slice(0, 1)

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>История импорта</CardTitle>
        <CardDescription>Просмотр логов импорта по датам</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: ru }) : <span>Выберите дату</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ru}
                modifiers={{
                  hasLogs: (date) => datesWithLogs.has(format(date, "yyyy-MM-dd")),
                }}
                modifiersStyles={{
                  hasLogs: {
                    fontWeight: "bold",
                    backgroundColor: "hsl(var(--primary) / 0.1)",
                  },
                }}
              />
            </PopoverContent>
          </Popover>
          {logs.length > 0 && (
            <Badge variant="secondary">
              {logs.length} {logs.length === 1 ? "импорт" : "импортов"}
            </Badge>
          )}
        </div>

        {loading && <div className="text-center text-muted-foreground">Загрузка логов...</div>}

        {!loading && logs.length === 0 && selectedDate && (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Нет логов импорта за выбранную дату</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="space-y-4">
            {displayedLogs.map((log) => (
              <Card key={log.id} className="rounded-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{log.settlement}</CardTitle>
                      <CardDescription>
                        {format(new Date(log.imported_at), "HH:mm:ss", { locale: ru })} • {log.file_name}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{log.file_type.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Добавлено</div>
                      <div className="text-xl font-bold text-green-600">{log.added_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Обновлено</div>
                      <div className="text-xl font-bold text-blue-600">{log.updated_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Архивировано</div>
                      <div className="text-xl font-bold text-orange-600">{log.archived_count}</div>
                    </div>
                  </div>

                  {log.details && log.details.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                        Детали ({log.details.length} записей)
                      </summary>
                      <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                        {log.details.map((detail, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "p-2 rounded text-xs",
                              detail.operation === "added" && "bg-green-50",
                              detail.operation === "updated" && "bg-blue-50",
                              detail.operation === "archived" && "bg-orange-50",
                              detail.operation === "error" && "bg-red-50",
                              detail.operation === "skipped" && "bg-gray-50",
                            )}
                          >
                            <span className="font-mono">{detail.cadastral_number}</span>
                            <span className="text-muted-foreground ml-2">
                              {detail.operation === "added" && "Добавлен"}
                              {detail.operation === "updated" && "Обновлен"}
                              {detail.operation === "archived" && "Архивирован"}
                              {detail.operation === "error" && "Ошибка"}
                              {detail.operation === "skipped" && "Пропущен"}
                            </span>
                            {detail.message && (
                              <div className="text-muted-foreground mt-1">
                                {detail.message}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}

            {logs.length > 1 && (
              <Button variant="outline" className="w-full bg-transparent" onClick={() => setIsExpanded(!isExpanded)}>
                <ChevronDown className={cn("h-4 w-4 mr-2 transition-transform", isExpanded && "rotate-180")} />
                {isExpanded ? `Скрыть ${logs.length - 1} записей` : `Показать еще ${logs.length - 1} записей`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
