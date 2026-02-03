"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Loader2, Send } from "lucide-react"

export function FaqContactForm() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        question: "",
    })

    useEffect(() => {
        const tryOpenFromHash = () => {
            if (typeof window === "undefined") return
            if (window.location.hash !== "#faq-form") return

            setIsOpen(true)

            requestAnimationFrame(() => {
                const el = document.getElementById("faq-form")
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
            })
        }

        tryOpenFromHash()

        window.addEventListener("hashchange", tryOpenFromHash)
        return () => window.removeEventListener("hashchange", tryOpenFromHash)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch("/api/public/lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    phone: formData.phone,
                    wishes: formData.question,
                    lead_type: "faq",
                }),
            })
            const result = await res.json().catch(() => ({}))

            if (res.ok && result.success) {
                setSuccess(true)
                setFormData({ name: "", phone: "", question: "" })
            } else {
                alert(result.error || "Произошла ошибка при отправке вопроса")
            }
        } catch (error) {
            console.error("Error submitting FAQ question:", error)
            alert("Не удалось отправить вопрос. Пожалуйста, попробуйте позже.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div id="faq-form">
            {!isOpen ? null : success ? (
                <Card className="bg-emerald-50 border-emerald-100 rounded-3xl p-8 md:p-12 text-center">
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex justify-center">
                            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Спасибо за ваш вопрос!</h2>
                        <p className="text-slate-600 max-w-md mx-auto">
                            Мы получили ваше сообщение и свяжемся с вами в ближайшее время, чтобы дать подробный ответ.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSuccess(false)
                                setIsOpen(true)
                            }}
                            className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        >
                            Задать другой вопрос
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <CardContent className="p-8 md:p-12 space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-slate-900">Задать свой вопрос</h2>
                            <p className="text-slate-500">
                                Оставьте свои контакты и напишите, что вас интересует — мы подготовим развернутый ответ.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-slate-700 ml-1">
                                        Ваше имя
                                    </label>
                                    <Input
                                        id="name"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Иван Иванов"
                                        className="rounded-xl h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="phone" className="text-sm font-medium text-slate-700 ml-1">
                                        Телефон
                                    </label>
                                    <Input
                                        id="phone"
                                        required
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+7 (___) ___-__-__"
                                        className="rounded-xl h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="question" className="text-sm font-medium text-slate-700 ml-1">
                                    Ваш вопрос
                                </label>
                                <Textarea
                                    id="question"
                                    required
                                    value={formData.question}
                                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                    placeholder="Опишите, что именно вы хотели бы уточнить..."
                                    className="rounded-2xl min-h-[150px] border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 py-3"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-semibold shadow-lg shadow-emerald-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Отправка...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-5 w-5" />
                                        Отправить вопрос
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-center text-slate-400">
                                Нажимая «Отправить», вы соглашаетесь с нашей
                                <a href="/privacy" className="text-emerald-600 hover:underline mx-1">политикой конфиденциальности</a>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
