"use client"

import { useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface HomeFAQItem {
  question: string
  answer: string
  icon?: string
}

export interface FAQBlockConfig {
  title?: string
  subtitle?: string
  items?: HomeFAQItem[]
}

export function FAQBlock({ config }: { config?: FAQBlockConfig | null }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formData, setFormData] = useState({ name: "", phone: "+7 (___) ___-__-__", question: "" })
  const phoneInputRef = useRef<HTMLInputElement | null>(null)

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
    setFormData((p) => ({ ...p, phone: formatted }))

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

  const title = config?.title || "FAQ"

  const isPhoneValid = useMemo(() => {
    if (formData.phone.includes("_")) return false
    const digits = formData.phone.replace(/\D/g, "")
    return digits.length === 11
  }, [formData.phone])

  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 1 && isPhoneValid && formData.question.trim().length > 3
  }, [formData.name, formData.question, isPhoneValid])

  const items = useMemo<HomeFAQItem[]>(() => {
    if (config?.items && config.items.length > 0) return config.items
    return [
      {
        question: "Можно ли в рассрочку?",
        answer: "Да, по некоторым участкам доступна рассрочка. Уточните у менеджера.",
        icon: "💳",
      },
      {
        question: "Есть ли коммуникации?",
        answer: "Зависит от участка. В карточке участка указаны коммуникации: свет, газ, вода.",
        icon: "⚡",
      },
      {
        question: "Какая категория земли?",
        answer: "В карточке участка указан статус/категория. При необходимости предоставим выписку.",
        icon: "📄",
      },
    ]
  }, [config?.items])

  return (
    <div className="bg-white py-8 px-4 rounded-2xl shadow-lg">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const isOpen = openIndex === idx
          return (
            <div key={`${item.question}-${idx}`} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{item.icon || "❓"}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.question}</span>
                </div>
                <span className="text-gray-400">{isOpen ? "–" : "+"}</span>
              </button>
              {isOpen ? (
                <div className="px-4 pb-3 text-sm text-gray-700 leading-relaxed">{item.answer}</div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-4">
        <Button
          type="button"
          className="w-full rounded-full !bg-primary !text-primary-foreground font-bold py-3 shadow-lg hover:!bg-primary/90"
          onClick={() => {
            setSubmitSuccess(false)
            setAskOpen(true)
          }}
        >
          Задать свой вопрос
        </Button>
      </div>

      <Dialog
        open={askOpen}
        onOpenChange={(open) => {
          setAskOpen(open)
          if (!open) {
            setSubmitting(false)
            setSubmitSuccess(false)
            setFormData({ name: "", phone: "+7 (___) ___-__-__", question: "" })
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle className="sr-only">Задать вопрос</DialogTitle>

          {submitSuccess ? (
            <div className="space-y-2">
              <div className="text-lg font-semibold">Спасибо!</div>
              <div className="text-sm text-muted-foreground">Мы получили ваш вопрос и свяжемся с вами в ближайшее время.</div>
              <div className="pt-2">
                <Button type="button" className="w-full rounded-xl" onClick={() => setAskOpen(false)}>
                  Закрыть
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()

                if (!isFormValid) {
                  alert("Заполните имя, телефон и вопрос")
                  return
                }
                setSubmitting(true)

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
                  const json = await res.json().catch(() => ({}))

                  if (res.ok && json?.success) {
                    setSubmitSuccess(true)
                    return
                  }

                  alert(json?.error || "Не удалось отправить вопрос")
                } catch (err) {
                  console.error("FAQ ask question submit error", err)
                  alert("Не удалось отправить вопрос. Попробуйте позже.")
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Имя</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Как к вам обращаться"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Телефон</label>
                <Input
                  ref={phoneInputRef}
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value, e.target.selectionStart)}
                  placeholder={"+7 (___) ___-__-__"}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ваш вопрос</label>
                <Textarea
                  value={formData.question}
                  onChange={(e) => setFormData((p) => ({ ...p, question: e.target.value }))}
                  placeholder="Напишите ваш вопрос"
                  className="rounded-xl min-h-[110px]"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 shadow-lg"
                disabled={submitting || !isFormValid}
              >
                {submitting ? "Отправка..." : "Отправить"}
              </Button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Нажимая кнопку, вы соглашаетесь с{" "}
                <a href="/privacy" className="underline hover:text-foreground transition-colors">
                  политикой конфиденциальности
                </a>
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
