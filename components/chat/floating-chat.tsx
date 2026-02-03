"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Loader2, Paperclip, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { getChatMessages, getOrganizationSettings } from "@/app/actions"
import { cn } from "@/lib/utils"
import type { OrganizationSettings } from "@/lib/types"

function safeRandomUUID() {
    if (typeof globalThis !== "undefined") {
        const c: any = (globalThis as any).crypto
        if (c?.randomUUID) return c.randomUUID()
        if (c?.getRandomValues) {
            const bytes = new Uint8Array(16)
            c.getRandomValues(bytes)
            bytes[6] = (bytes[6] & 0x0f) | 0x40
            bytes[8] = (bytes[8] & 0x3f) | 0x80
            const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
        }
    }

    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

interface Message {
    id: string
    text: string
    sender: "user" | "admin"
    created_at: string
    file_url?: string | null
    file_name?: string | null
}

// Common emojis for quick access
const QUICK_EMOJIS = ["😊", "👍", "🙏", "❤️", "👋", "🏠", "🌳", "📍", "💰", "📞", "✅", "❓"]

export function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState("")
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [settings, setSettings] = useState<OrganizationSettings | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const supabase = createClient()

    // Initialize session and load history
    useEffect(() => {
        const existingId = localStorage.getItem("rkk_chat_session_id")
        const id = existingId ?? safeRandomUUID()
        if (!existingId) {
            localStorage.setItem("rkk_chat_session_id", id)
        }
        setSessionId(id)

        const fetchSettingsAndHistory = async () => {
            setIsLoading(true)
            try {
                const [s, history] = await Promise.all([
                    getOrganizationSettings(),
                    getChatMessages(id!)
                ])
                setSettings(s)
                setMessages(history as Message[])
            } catch (error) {
                console.error("Error loading chat data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSettingsAndHistory()

        // Subscribe to new messages
        const channel = supabase
            .channel(`chat:${id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                    filter: `session_id=eq.${id}`,
                },
                (payload: { new: Message }) => {
                    const newMessage = payload.new
                    setMessages((prev) => {
                        // Avoid duplicate messages (e.g. if we get payload for our own sent message)
                        if (prev.find((m) => m.id === newMessage.id)) return prev
                        return [...prev, newMessage]
                    })
                }
            )
            .subscribe()

        // Polling fallback (in case Realtime is not enabled or fails)
        const POLL_INTERVAL_MS = 2500
        const interval = setInterval(async () => {
            try {
                const latest = (await getChatMessages(id)) as Message[]
                setMessages((prev) => {
                    const byId = new Map<string, Message>()
                    for (const m of prev) byId.set(m.id, m)
                    for (const m of latest || []) {
                        if (!byId.has(m.id)) byId.set(m.id, m)
                    }
                    return Array.from(byId.values()).sort(
                        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                    )
                })
            } catch {
                // ignore polling errors
            }
        }, POLL_INTERVAL_MS)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [supabase])

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const handleSend = async (text?: string) => {
        const msgText = text || inputValue.trim()
        if (!msgText || !sessionId || isSending) return

        setInputValue("")
        setIsSending(true)
        setShowEmojiPicker(false)

        // Optimistic update
        const tempId = safeRandomUUID()
        const optimisticMsg: Message = {
            id: tempId,
            text: msgText,
            sender: "user",
            created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, optimisticMsg])

        try {
            const res = await fetch("/api/public/chat/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, text: msgText }),
            })
            const result = await res.json().catch(() => ({}))
            if (!res.ok || !result.success) {
                console.error("Failed to send message:", result.error)
            } else {
                setMessages((prev) => prev.map((m) => (m.id === tempId ? (result.message as Message) : m)))
            }
        } catch (error) {
            console.error("Failed to send message:", error)
        }

        setIsSending(false)
    }

    const handleQuickQuestion = (question: string) => {
        handleSend(question)
    }

    const insertEmoji = (emoji: string) => {
        setInputValue((prev) => prev + emoji)
        setShowEmojiPicker(false)
        inputRef.current?.focus()
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !sessionId) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("sessionId", sessionId)

            const res = await fetch("/api/public/chat/upload", {
                method: "POST",
                body: formData,
            })
            const result = await res.json()
            if (result.success) {
                // Message will come through realtime or polling
            } else {
                console.error("Failed to upload file:", result.error)
            }
        } catch (error) {
            console.error("Failed to upload file:", error)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const consultantName = settings?.chat_consultant_name || "Консультант"
    const consultantAvatar = settings?.chat_consultant_avatar_url
    const quickQuestions = settings?.chat_quick_questions || ["Здравствуйте!", "Хочу узнать о участках"]
    const welcomeMessage = settings?.chat_welcome_message || "Здравствуйте! Я могу вам чем-то помочь?"

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <Card className="mb-4 w-[350px] sm:w-[400px] h-[550px] flex flex-col shadow-2xl border-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Header with gradient */}
                    <CardHeader className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white p-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            {consultantAvatar ? (
                                <img
                                    src={consultantAvatar}
                                    alt={consultantName}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white/30 shadow-lg"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                    <MessageCircle className="h-6 w-6" />
                                </div>
                            )}
                            <div>
                                <CardTitle className="text-lg font-semibold">{consultantName}</CardTitle>
                                <p className="text-xs text-white/80">Консультант</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 rounded-full"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Welcome message from consultant */}
                                {messages.length === 0 && (
                                    <div className="space-y-4">
                                        {/* Consultant message */}
                                        <div className="flex items-start gap-2">
                                            {consultantAvatar ? (
                                                <img
                                                    src={consultantAvatar}
                                                    alt={consultantName}
                                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">{consultantName}</p>
                                                <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-3 max-w-[80%]">
                                                    <p className="text-sm text-slate-800">{welcomeMessage}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick questions */}
                                        <div className="space-y-2 pl-10">
                                            {quickQuestions.map((question, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleQuickQuestion(question)}
                                                    className="block w-full text-left px-4 py-2.5 text-sm border border-slate-200 rounded-full hover:border-emerald-400 hover:bg-emerald-50 transition-colors text-slate-700"
                                                >
                                                    {question}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Messages */}
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex w-full mb-2",
                                            msg.sender === "user" ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {msg.sender === "admin" && (
                                            <div className="flex items-start gap-2">
                                                {consultantAvatar ? (
                                                    <img
                                                        src={consultantAvatar}
                                                        alt={consultantName}
                                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs text-slate-500 mb-1">{consultantName}</p>
                                                    <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-3 max-w-[250px]">
                                                        <p className="text-sm text-slate-800">{msg.text}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {msg.sender === "user" && (
                                            <div className="max-w-[80%] p-3 rounded-2xl rounded-tr-sm text-sm shadow-sm bg-emerald-600 text-white">
                                                {msg.file_url ? (
                                                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
                                                        <Paperclip className="h-3 w-3" />
                                                        {msg.file_name || "Файл"}
                                                    </a>
                                                ) : (
                                                    msg.text
                                                )}
                                                <div className="text-[10px] mt-1 opacity-70 text-right">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </CardContent>

                    <CardFooter className="p-3 bg-white border-t border-slate-100 flex-col gap-2">
                        {/* Emoji picker */}
                        {showEmojiPicker && (
                            <div className="w-full p-2 bg-slate-50 rounded-xl mb-1 flex flex-wrap gap-1 animate-in fade-in duration-200">
                                {QUICK_EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => insertEmoji(emoji)}
                                        className="w-8 h-8 text-lg hover:bg-slate-200 rounded transition-colors"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex w-full items-center gap-2">
                            {/* Toolbar buttons */}
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-slate-400 hover:text-slate-600"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Paperclip className="h-5 w-5" />
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-9 w-9 text-slate-400 hover:text-slate-600",
                                        showEmojiPicker && "bg-slate-100 text-slate-600"
                                    )}
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <Smile className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={handleFileSelect}
                            />

                            {/* Text input */}
                            <textarea
                                ref={inputRef}
                                placeholder={settings?.chat_prompt_placeholder || "Введите сообщение"}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSend()
                                    }
                                }}
                                className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[40px] max-h-[80px]"
                                disabled={isSending}
                                rows={1}
                            />

                            {/* Send button */}
                            <Button
                                type="button"
                                size="icon"
                                className="bg-emerald-600 hover:bg-emerald-700 shrink-0 h-10 w-10 rounded-full"
                                onClick={() => handleSend()}
                                disabled={!inputValue.trim() || isSending}
                            >
                                {isSending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}

            {/* Floating Button */}
            {!isOpen && settings?.chat_widget_enabled !== false && (
                <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                    onClick={() => setIsOpen(true)}
                >
                    <MessageCircle className="h-8 w-8 text-white group-hover:rotate-12 transition-transform" />
                </Button>
            )}
        </div>
    )
}
