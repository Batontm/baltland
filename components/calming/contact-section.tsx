"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react"
import { getOrganizationSettings } from "@/app/actions"
import type { OrganizationSettings } from "@/lib/types"

export function ContactSection() {
  const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("+7 (___) ___-__-__")
  const phoneInputRef = useRef<HTMLInputElement | null>(null)

  // Phone mask formatting function
  const formatPhoneNumber = (value: string): string => {
    // Keep country code fixed (+7) and format only the 10 national digits
    let digits = value.replace(/\D/g, "")

    if (digits.startsWith("7") || digits.startsWith("8")) {
      digits = digits.slice(1)
    }

    digits = digits.slice(0, 10)

    const d = digits
    const p1 = d.slice(0, 3).padEnd(3, "_")
    const p2 = d.slice(3, 6).padEnd(3, "_")
    const p3 = d.slice(6, 8).padEnd(2, "_")
    const p4 = d.slice(8, 10).padEnd(2, "_")

    return `+7 (${p1}) ${p2}-${p3}-${p4}`
  }

  const digitIndexFromCaret = (value: string, caretPos: number | null) => {
    if (caretPos === null) return null
    const before = value.slice(0, caretPos)
    // Exclude the fixed country code digit (7)
    const digits = before.replace(/\D/g, "")
    return digits.startsWith("7") ? Math.max(digits.length - 1, 0) : digits.length
  }

  const caretFromDigitIndex = (value: string, digitIndex: number) => {
    if (digitIndex <= 0) return 0
    let count = 0
    let skippedCountry = false
    for (let i = 0; i < value.length; i++) {
      if (/\d/.test(value[i])) {
        if (!skippedCountry && value[i] === "7") {
          skippedCountry = true
        } else {
          count++
        }
      }
      if (count >= digitIndex) return i + 1
    }
    return value.length
  }

  const handlePhoneChange = (rawValue: string, caretPos: number | null) => {
    const digitIndex = digitIndexFromCaret(rawValue, caretPos)
    const formatted = formatPhoneNumber(rawValue)
    setPhone(formatted)

    if (digitIndex === null) return
    const nextCaret = caretFromDigitIndex(formatted, digitIndex)

    requestAnimationFrame(() => {
      const el = phoneInputRef.current
      if (!el) return
      try {
        el.setSelectionRange(nextCaret, nextCaret)
      } catch {
        // ignore
      }
    })
  }
  const [wishes, setWishes] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      const orgSettings = await getOrganizationSettings()
      setSettings(orgSettings)
    }
    loadSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormState("loading")
    setErrorMessage("")

    try {
      const res = await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, wishes }),
      })
      const result = await res.json().catch(() => ({}))

      if (res.ok && result.success) {
        setFormState("success")
      } else {
        setFormState("error")
        setErrorMessage(result.error || "Ошибка отправки")
      }
    } catch (error) {
      setFormState("error")
      setErrorMessage("Ошибка соединения")
    }
  }

  const contacts = [
    {
      icon: Phone,
      label: "Телефон",
      value: settings?.phone || "+7 931 605-44-84",
      href: `tel:${settings?.phone?.replace(/\D/g, "") || "+79316054484"}`,
    },
    {
      icon: Mail,
      label: "Email",
      value: settings?.email || "info@baltland.ru",
      href: `mailto:${settings?.email || "info@baltland.ru"}`,
    },
    {
      icon: MapPin,
      label: "Офис",
      value: settings?.address || "Калининград, ул. Брамса, 40",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings?.address || "Калининград, ул. Брамса, 40")}`,
      target: "_blank",
    },
  ]

  return (
    <section id="contact" className="py-24 bg-gradient-to-b from-secondary/30 to-background relative overflow-hidden">
      {/* Floating Elements */}
      <div className="absolute top-1/2 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float-slow -translate-y-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Side - Info */}
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1">
              Контакты
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium mb-6 text-balance">
              Получите персональную подборку участков
            </h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Оставьте заявку, и наш специалист подберёт для вас лучшие участки с учётом ваших пожеланий и бюджета.
              Консультация бесплатная.
            </p>

            {/* Contact Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {contacts.map((contact, index) => (
                <a
                  key={index}
                  href={contact.href}
                  target={contact.target}
                  rel={contact.target === "_blank" ? "noopener noreferrer" : undefined}
                  className="group p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary/70 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <contact.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{contact.label}</div>
                      <div className="font-medium group-hover:text-primary transition-colors">{contact.value}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Right Side - Form */}
          <Card className="rounded-3xl border-border/50 shadow-2xl shadow-primary/5 overflow-hidden">
            <CardContent className="p-8 lg:p-10">
              {formState === "success" ? (
                <div className="text-center py-10 animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-serif font-semibold mb-3">Заявка отправлена!</h3>
                  <p className="text-muted-foreground mb-6">
                    Мы свяжемся с вами в ближайшее время для уточнения деталей.
                  </p>
                  <Button
                    variant="outline"
                    className="rounded-xl bg-transparent"
                    onClick={() => {
                      setFormState("idle")
                      setName("")
                      setPhone("+7 (___) ___-__-__")
                      setWishes("")
                    }}
                  >
                    Отправить ещё заявку
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 className="text-2xl font-serif font-semibold mb-2">Оставить заявку</h3>
                    <p className="text-muted-foreground">Заполните форму и получите подборку участков</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ваше имя</label>
                      <Input
                        type="text"
                        placeholder="Иван Иванов"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-13 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Телефон</label>
                      <Input
                        type="tel"
                        placeholder="+7 (___) ___-__-__"
                        value={phone}
                        ref={phoneInputRef}
                        onChange={(e) => handlePhoneChange(e.target.value, e.target.selectionStart)}
                        required
                        className="h-13 rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ваши пожелания по участкам</label>
                      <Textarea
                        placeholder="Например: участок 10-15 соток, рядом с лесом, до 2 млн рублей..."
                        value={wishes}
                        onChange={(e) => setWishes(e.target.value)}
                        className="min-h-[100px] rounded-xl bg-secondary/30 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
                      />
                    </div>

                    {formState === "error" && <p className="text-sm text-destructive">{errorMessage}</p>}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-14 rounded-xl text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-shadow"
                      disabled={formState === "loading"}
                    >
                      {formState === "loading" ? (
                        <>
                          <span className="animate-pulse">Отправка...</span>
                        </>
                      ) : (
                        <>
                          Получить подборку участков
                          <Send className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground pt-2">
                      Нажимая кнопку, вы соглашаетесь с{" "}
                      <a href="/privacy" className="underline hover:text-foreground transition-colors">
                        политикой конфиденциальности
                      </a>
                    </p>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
