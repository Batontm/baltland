"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Phone, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

interface CallbackButtonsProps {
  phone?: string | null
  plotTitle: string
  cadastralNumber?: string | null
  plotId?: string
  location?: string
  price?: number
  areaSotok?: number
}

export function CallbackButtons({ phone, plotTitle, cadastralNumber, plotId, location, price, areaSotok }: CallbackButtonsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [userPhone, setUserPhone] = useState("")
  const [messenger, setMessenger] = useState<"max" | "telegram" | "whatsapp" | "">("")
  const [preferredDate, setPreferredDate] = useState("")
  const [preferredTime, setPreferredTime] = useState("")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  // Phone mask formatter: +7 (XXX) XXX-XX-XX
  const formatPhone = useCallback((value: string) => {
    let digits = value.replace(/\D/g, "")
    if (digits.startsWith("8")) {
      digits = "7" + digits.slice(1)
    }
    if (digits.length > 0 && !digits.startsWith("7")) {
      digits = "7" + digits
    }
    digits = digits.slice(0, 11)

    if (digits.length === 0) return ""
    if (digits.length <= 1) return "+7"
    if (digits.length <= 4) return `+7 (${digits.slice(1)}`
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }, [])

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUserPhone(formatPhone(e.target.value))
  }, [formatPhone])

  const resetForm = () => {
    setName("")
    setUserPhone("")
    setMessenger("")
    setPreferredDate("")
    setPreferredTime("")
    setConsent(false)
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!consent) {
      setError("Подтвердите согласие на обработку персональных данных")
      return
    }
    if (!userPhone.trim() || userPhone.length < 18) {
      setError("Укажите корректный телефон")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/public/viewing-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: userPhone,
          messenger_telegram: messenger === "telegram",
          messenger_whatsapp: messenger === "whatsapp",
          messenger_max: messenger === "max",
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          consent,
          plot: {
            id: plotId,
            location,
            cadastral_number: cadastralNumber,
            price,
            area_sotok: areaSotok,
            title: plotTitle,
          },
        }),
      })

      const result = await res.json().catch(() => ({}))

      if (res.ok && result.success) {
        toast({
          title: "Заявка отправлена",
          description: "Мы свяжемся с вами для согласования времени просмотра",
        })
        setIsDialogOpen(false)
        resetForm()
      } else {
        throw new Error(result.error || "Ошибка отправки")
      }
    } catch (err: any) {
      setError(String(err?.message || err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {/* Call button */}
        {phone && (
          <Button asChild size="lg" className="rounded-full px-6">
            <a href={`tel:${phone}`}>
              <Phone className="h-4 w-4 mr-2" />
              Позвонить
            </a>
          </Button>
        )}

        {/* Viewing request button */}
        <Button
          size="lg"
          className="rounded-full px-6"
          onClick={() => setIsDialogOpen(true)}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Записаться на просмотр
        </Button>
      </div>

      {/* Viewing Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Записаться на просмотр</DialogTitle>
            <DialogDescription>
              Оставьте свои контактные данные и укажите удобное время для просмотра участка
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <div className="font-semibold text-slate-900">{plotTitle}</div>
              {cadastralNumber && <div className="font-mono text-xs">{cadastralNumber}</div>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">ФИО</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={userPhone}
                onChange={handlePhoneChange}
                placeholder="+7 (___) ___-__-__"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Предпочтительный мессенджер</Label>
              <Select value={messenger} onValueChange={(v) => setMessenger(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="max">MAX</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="date">Желаемая дата</Label>
                <Input
                  id="date"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Время</Label>
                <Input
                  id="time"
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(Boolean(v))}
              />
              <label htmlFor="consent" className="text-xs text-slate-600 leading-snug cursor-pointer">
                Я ознакомлен(а) и согласен(на) с обработкой персональных данных
              </label>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Отправка..." : "Отправить заявку"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
