"use client"

import { useState, useEffect, useCallback } from "react"
import { Send, Loader2, CheckCircle, XCircle, Pause, Play, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

interface Batch {
    id: string
    platform: string
    total_count: number
    processed_count: number
    success_count: number
    error_count: number
    status: string
    started_at: string | null
    completed_at: string | null
}

export function VKBulkExportCard() {
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [batch, setBatch] = useState<Batch | null>(null)
    const [plotCount, setPlotCount] = useState<number | null>(null)
    const { toast } = useToast()

    // Fetch plot count and active batch
    useEffect(() => {
        fetchStatus()
    }, [])

    const fetchStatus = async () => {
        try {
            // Get active batch
            const batchRes = await fetch("/api/admin/social/vk/bulk-export")
            const batchData = await batchRes.json()

            if (batchData.batches?.length) {
                const activeBatch = batchData.batches.find((b: Batch) =>
                    b.status === "running" || b.status === "pending"
                )
                if (activeBatch) {
                    setBatch(activeBatch)
                }
            }
        } catch (error) {
            console.error("Failed to fetch status:", error)
        }
    }

    const startBulkExport = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/social/vk/bulk-export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filters: { status: "active" } }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to start export")
            }

            toast({
                title: "Экспорт запущен",
                description: `${data.totalCount} участков в очереди`,
            })

            // Fetch new batch
            const batchRes = await fetch(`/api/admin/social/vk/bulk-export?batchId=${data.batchId}`)
            const batchData = await batchRes.json()
            setBatch(batchData.batch)

            // Start processing
            processQueue(data.batchId)
        } catch (error: any) {
            toast({
                title: "Ошибка",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const processQueue = useCallback(async (batchId: string) => {
        setProcessing(true)

        let continueProcessing = true

        while (continueProcessing) {
            try {
                const res = await fetch("/api/admin/social/vk/process-queue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ batchId, limit: 10 }),
                })

                const data = await res.json()

                if (!res.ok) {
                    throw new Error(data.error)
                }

                // Refresh batch status
                const batchRes = await fetch(`/api/admin/social/vk/bulk-export?batchId=${batchId}`)
                const batchData = await batchRes.json()
                setBatch(batchData.batch)

                if (data.completed || batchData.batch?.status === "completed") {
                    continueProcessing = false
                    toast({
                        title: "Экспорт завершён",
                        description: `Успешно: ${batchData.batch?.success_count}, Ошибок: ${batchData.batch?.error_count}`,
                    })
                }

                if (batchData.batch?.status === "paused" || batchData.batch?.status === "cancelled") {
                    continueProcessing = false
                }

                // Small delay between batches
                await new Promise(r => setTimeout(r, 500))
            } catch (error: any) {
                console.error("Process error:", error)
                continueProcessing = false
                toast({
                    title: "Ошибка обработки",
                    description: error.message,
                    variant: "destructive",
                })
            }
        }

        setProcessing(false)
    }, [toast])

    const pauseBatch = async () => {
        if (!batch) return

        try {
            // Update batch status to paused (via direct API call)
            // For now, just stop processing client-side
            setProcessing(false)
            toast({
                title: "Пауза",
                description: "Экспорт приостановлен",
            })
        } catch (error: any) {
            console.error("Pause error:", error)
        }
    }

    const resumeBatch = async () => {
        if (!batch) return
        processQueue(batch.id)
    }

    const progress = batch
        ? Math.round((batch.processed_count / batch.total_count) * 100)
        : 0

    const remaining = batch
        ? batch.total_count - batch.processed_count
        : 0

    const estimatedMinutes = remaining > 0
        ? Math.ceil(remaining / 120) // ~120 per minute with rate limiting
        : 0

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Массовая публикация в VK
                </CardTitle>
                <CardDescription>
                    Публикация всех активных участков на стену группы VK
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {batch && batch.status !== "completed" ? (
                    <>
                        <Progress value={progress} className="h-3" />

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Опубликовано: {batch.success_count}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span>Ошибок: {batch.error_count}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 text-blue-500" />
                                <span>Осталось: {remaining}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                <span>~{estimatedMinutes} мин</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {processing ? (
                                <Button onClick={pauseBatch} variant="outline" className="flex-1">
                                    <Pause className="h-4 w-4 mr-2" />
                                    Пауза
                                </Button>
                            ) : (
                                <Button onClick={resumeBatch} className="flex-1">
                                    <Play className="h-4 w-4 mr-2" />
                                    Продолжить
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {batch?.status === "completed" && (
                            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
                                ✅ Последний экспорт завершён: {batch.success_count} опубликовано, {batch.error_count} ошибок
                            </div>
                        )}
                        <Button
                            onClick={startBulkExport}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Запуск...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Начать экспорт
                                </>
                            )}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
