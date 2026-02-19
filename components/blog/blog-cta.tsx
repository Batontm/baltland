"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Phone, User, MessageSquare, Send, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { createLead } from "@/app/actions"

export function BlogCTA() {
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [wishes, setWishes] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !phone.trim()) return

        setLoading(true)
        setError("")

        try {
            const result = await createLead({
                name: name.trim(),
                phone: phone.trim(),
                wishes: wishes.trim() || undefined,
            })

            if (result.success) {
                setSuccess(true)
                setName("")
                setPhone("")
                setWishes("")
            } else {
                setError(result.error || "Не удалось отправить заявку. Попробуйте позже.")
            }
        } catch {
            setError("Ошибка соединения. Попробуйте позже.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mt-16 mb-8">
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-8 sm:p-12">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />

                <div className="relative">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="flex justify-center mb-4">
                                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Заявка отправлена!</h3>
                            <p className="text-muted-foreground mb-6">Мы свяжемся с вами в ближайшее время для подбора участка.</p>
                            <Link href="/catalog">
                                <Button variant="outline" className="rounded-xl">
                                    Посмотреть каталог участков
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h3 className="text-2xl sm:text-3xl font-bold mb-3">
                                    Нужна помощь? Подберём участок под ваши требования
                                </h3>
                                <p className="text-muted-foreground max-w-xl mx-auto">
                                    Оставьте заявку и наш специалист бесплатно проконсультирует вас по всем вопросам, связанным с покупкой земельного участка.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Ваше имя"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10 h-12 rounded-xl bg-background/80 border-border/50"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="tel"
                                        placeholder="Телефон"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="pl-10 h-12 rounded-xl bg-background/80 border-border/50"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                                    <textarea
                                        placeholder="Пожелания (необязательно)"
                                        value={wishes}
                                        onChange={(e) => setWishes(e.target.value)}
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background/80 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-500 text-center">{error}</p>
                                )}

                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={loading}
                                    className="w-full h-12 rounded-xl text-base font-medium"
                                >
                                    {loading ? (
                                        "Отправляем..."
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            Оставить заявку
                                        </>
                                    )}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground">
                                    Нажимая кнопку, вы соглашаетесь с{" "}
                                    <Link href="/privacy" className="underline hover:text-primary">
                                        политикой конфиденциальности
                                    </Link>
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
