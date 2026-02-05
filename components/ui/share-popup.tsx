"use client"

import { useState, useRef, useEffect } from "react"
import { Share2, X, Copy, Check, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SharePopupProps {
    url: string
    title: string
    description?: string
    cadastralNumber?: string
    price?: number
    area?: number
    location?: string
    className?: string
    iconClassName?: string
}

export function SharePopup({
    url,
    title,
    description,
    cadastralNumber,
    price,
    area,
    location,
    className,
    iconClassName,
}: SharePopupProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showLeadForm, setShowLeadForm] = useState(false)
    const [contact, setContact] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const popupRef = useRef<HTMLDivElement>(null)

    const formatPrice = (p: number) => new Intl.NumberFormat("ru-RU").format(p) + " ₽"

    const shareText = [
        title,
        location && `📍 ${location}`,
        cadastralNumber && `КН: ${cadastralNumber}`,
        area && `📐 ${area} сот.`,
        price && `💰 ${formatPrice(price)}`,
        description,
    ]
        .filter(Boolean)
        .join("\n")

    const encodedUrl = encodeURIComponent(url)
    const encodedText = encodeURIComponent(shareText)

    const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
    const whatsappUrl = `https://wa.me/?text=${encodedText}%0A${encodedUrl}`

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                setShowLeadForm(false)
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen])

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        // Check for Web Share API (mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text: shareText,
                    url,
                })
                return
            } catch (err) {
                // User cancelled or error - fall through to popup
                if ((err as Error).name === "AbortError") return
            }
        }

        // Fallback to popup
        setIsOpen(true)
    }

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement("textarea")
            textarea.value = url
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand("copy")
            document.body.removeChild(textarea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleSubmitLead = async () => {
        if (!contact.trim()) return

        setIsSubmitting(true)
        setSubmitError("")

        try {
            const res = await fetch("/api/public/share-lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contact: contact.trim(),
                    plot: {
                        url,
                        title,
                        cadastral_number: cadastralNumber,
                        price,
                        area,
                        location,
                    },
                }),
            })

            const result = await res.json().catch(() => ({}))

            if (res.ok && result.success) {
                setSubmitSuccess(true)
                setTimeout(() => {
                    setIsOpen(false)
                    setShowLeadForm(false)
                    setSubmitSuccess(false)
                    setContact("")
                }, 2000)
            } else {
                setSubmitError(result.error || "Ошибка отправки")
            }
        } catch {
            setSubmitError("Ошибка соединения")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className={cn("relative", className)} ref={popupRef}>
            {/* Share Button */}
            <button
                onClick={handleShare}
                className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-sm group/share"
                aria-label="Поделиться"
            >
                <Share2
                    className={cn(
                        "h-4 w-4 transition-colors text-slate-400 group-hover/share:text-slate-600",
                        iconClassName
                    )}
                />
            </button>

            {/* Popup */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 min-w-[240px]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-slate-700">Поделиться</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsOpen(false)
                                    setShowLeadForm(false)
                                }}
                                className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>

                        {!showLeadForm ? (
                            <>
                                {/* Social Buttons */}
                                <div className="flex gap-3 mb-4">
                                    {/* Telegram */}
                                    <a
                                        href={telegramUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <Send className="h-5 w-5 text-white" />
                                        <span className="text-xs font-medium text-white">Telegram</span>
                                    </a>

                                    {/* WhatsApp */}
                                    <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 transition-all shadow-sm hover:shadow-md"
                                    >
                                        <MessageCircle className="h-5 w-5 text-white" />
                                        <span className="text-xs font-medium text-white">WhatsApp</span>
                                    </a>
                                </div>

                                {/* Copy Link */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleCopyLink()
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-medium text-slate-700"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4 text-green-500" />
                                            <span className="text-green-600">Скопировано!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            <span>Скопировать ссылку</span>
                                        </>
                                    )}
                                </button>

                                {/* Lead Form Toggle */}
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setShowLeadForm(true)
                                        }}
                                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white text-sm font-medium transition-all shadow-sm hover:shadow-md"
                                    >
                                        📩 Получить подробности
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Lead Form */
                            <div className="space-y-3">
                                {submitSuccess ? (
                                    <div className="text-center py-4">
                                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                                            <Check className="h-6 w-6 text-green-500" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">Заявка отправлена!</p>
                                        <p className="text-xs text-slate-500 mt-1">Мы свяжемся с вами в ближайшее время</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-slate-600">
                                            Укажите телефон или Telegram, и мы пришлём подробную информацию об участке
                                        </p>
                                        <Input
                                            value={contact}
                                            onChange={(e) => setContact(e.target.value)}
                                            placeholder="+7... или @username"
                                            className="h-11 rounded-xl"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {submitError && (
                                            <p className="text-xs text-red-500">{submitError}</p>
                                        )}
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 rounded-xl"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setShowLeadForm(false)
                                                }}
                                            >
                                                Назад
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 rounded-xl"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSubmitLead()
                                                }}
                                                disabled={isSubmitting || !contact.trim()}
                                            >
                                                {isSubmitting ? "..." : "Отправить"}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
