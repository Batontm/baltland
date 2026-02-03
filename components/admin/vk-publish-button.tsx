"use client"

import { useState, useEffect } from "react"
import { Send, Loader2, CheckCircle, XCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"

interface VKPublishButtonProps {
    plotId: string
    compact?: boolean
    initialPost?: {
        url: string | null
        published_at: string | null
    } | null
}

export function VKPublishButton({ plotId, compact = false, initialPost }: VKPublishButtonProps) {
    const [loading, setLoading] = useState(false)
    const [published, setPublished] = useState(!!initialPost)
    const [postUrl, setPostUrl] = useState<string | null>(initialPost?.url || null)
    const [error, setError] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        if (initialPost === undefined) {
            checkStatus()
        }
    }, [plotId])

    const checkStatus = async () => {
        try {
            const res = await fetch(`/api/admin/social/vk/publish?plotId=${plotId}`)
            const data = await res.json()

            if (data.published) {
                setPublished(true)
                setPostUrl(data.post?.external_url || null)
            }
        } catch (error) {
            console.error("Failed to check VK status:", error)
        }
    }

    const publish = async () => {
        setLoading(true)
        setError(null)

        try {
            const res = await fetch("/api/admin/social/vk/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plotId }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Ошибка публикации")
            }

            setPublished(true)
            setPostUrl(data.url)

            toast({
                title: "Опубликовано в VK",
                description: "Участок успешно опубликован на стену группы",
            })
        } catch (error: any) {
            setError(error.message)
            toast({
                title: "Ошибка",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const remove = async () => {
        setLoading(true)

        try {
            const res = await fetch(`/api/admin/social/vk/publish?plotId=${plotId}`, {
                method: "DELETE",
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Ошибка удаления")
            }

            setPublished(false)
            setPostUrl(null)

            toast({
                title: "Удалено из VK",
                description: "Пост удалён со стены группы",
            })
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

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant={published ? "outline" : "ghost"}
                            onClick={publish}
                            disabled={loading}
                            className={published ? "text-blue-600 border-blue-200" : error ? "text-gray-400" : ""}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : error ? (
                                <XCircle className="h-4 w-4" />
                            ) : published ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className={error ? "max-w-xs bg-white text-gray-900 border border-gray-300 shadow-lg" : ""}>
                        {error ? (
                            <div className="space-y-1">
                                <div className="font-medium text-red-600">Ошибка VK:</div>
                                <div className="text-sm text-gray-700">{error}</div>
                            </div>
                        ) : published ? "Повторно опубликовать в VK" : "Опубликовать в VK"}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <div className="flex items-center gap-2">
            {published ? (
                <>
                    <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>В VK</span>
                    </div>
                    {postUrl && (
                        <a
                            href={postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Открыть
                        </a>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={remove}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                    >
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    </Button>
                </>
            ) : (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={publish}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Публикация...
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4 mr-1" />
                            В VK
                        </>
                    )}
                </Button>
            )}
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    )
}
