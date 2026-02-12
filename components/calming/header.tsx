"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Menu, Phone, MapPin, TreePine, Youtube, Instagram, MessageCircle, Send, Calendar } from "lucide-react"
import { getOrganizationSettings } from "@/app/actions"
import type { OrganizationSettings } from "@/lib/types"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)
  const [isViewingOpen, setIsViewingOpen] = useState(false)
  const [viewingName, setViewingName] = useState("")
  const [viewingPhone, setViewingPhone] = useState("")
  const [viewingMessenger, setViewingMessenger] = useState<string>("")
  const [viewingDate, setViewingDate] = useState("")
  const [viewingTime, setViewingTime] = useState("")
  const [viewingConsent, setViewingConsent] = useState(false)
  const [viewingError, setViewingError] = useState("")
  const [viewingSubmitting, setViewingSubmitting] = useState(false)
  const [viewingSuccess, setViewingSuccess] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const orgSettings = await getOrganizationSettings()
      setSettings(orgSettings)
    }
    loadSettings()
  }, [])

  const formatPhone = useCallback((value: string) => {
    let digits = value.replace(/\D/g, "")
    if (digits.startsWith("8")) digits = "7" + digits.slice(1)
    if (digits.length > 0 && !digits.startsWith("7")) digits = "7" + digits
    digits = digits.slice(0, 11)
    if (digits.length === 0) return ""
    if (digits.length <= 1) return "+7"
    if (digits.length <= 4) return `+7 (${digits.slice(1)}`
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }, [])

  const resetViewingForm = () => {
    setViewingName("")
    setViewingPhone("")
    setViewingMessenger("")
    setViewingDate("")
    setViewingTime("")
    setViewingConsent(false)
    setViewingError("")
    setViewingSuccess(false)
  }

  const handleViewingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setViewingError("")
    if (!viewingConsent) {
      setViewingError("Подтвердите согласие на обработку персональных данных")
      return
    }
    if (!viewingPhone.trim() || viewingPhone.length < 18) {
      setViewingError("Укажите корректный телефон")
      return
    }
    setViewingSubmitting(true)
    try {
      const res = await fetch("/api/public/viewing-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: viewingName,
          phone: viewingPhone,
          messenger_telegram: viewingMessenger === "telegram",
          messenger_whatsapp: viewingMessenger === "whatsapp",
          messenger_max: viewingMessenger === "max",
          preferred_date: viewingDate,
          preferred_time: viewingTime,
          consent: viewingConsent,
          plot: null,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (res.ok && result.success) {
        setViewingSuccess(true)
      } else {
        setViewingError(result.error || "Ошибка отправки")
      }
    } catch {
      setViewingError("Ошибка соединения")
    } finally {
      setViewingSubmitting(false)
    }
  }

  const navItems = [
    { label: "Каталог", href: "/catalog" },
    { label: "Новости", href: "/news" },
    { label: "О компании", href: "/about" },
    { label: "Помощь покупателю", href: "/faq" },
    { label: "Контакты", href: "/contacts" },
  ]

  const SocialMediaIcons = () => {
    const hasAny = (settings?.show_vk && settings?.vk_url) ||
      (settings?.show_telegram && settings?.telegram_url) ||
      (settings?.show_whatsapp && settings?.whatsapp_url) ||
      (settings?.show_youtube && settings?.youtube_url) ||
      (settings?.show_instagram && settings?.instagram_url);

    if (!hasAny) return null

    const ensureProtocol = (url: string) => {
      if (!url) return ""
      return url.startsWith("http") ? url : `https://${url}`
    }

    return (
      <div className="flex items-center gap-2">
        {settings.show_vk && settings.vk_url && (
          <a
            href={ensureProtocol(settings.vk_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="VK"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.578-1.496c.59-.19 1.346 1.26 2.148 1.818.606.422 1.067.33 1.067.33l2.144-.03s1.122-.07.59-.967c-.044-.073-.31-.663-1.597-1.875-1.349-1.27-1.168-1.064.456-3.26.99-1.338 1.385-2.154 1.262-2.503-.117-.333-.842-.245-.842-.245l-2.414.015s-.179-.025-.312.056c-.13.08-.214.265-.214.265s-.383 1.037-.893 1.918c-1.075 1.86-1.506 1.96-1.682 1.843-.41-.27-.307-1.086-.307-1.665 0-1.81.27-2.565-.527-2.76-.265-.065-.46-.108-1.138-.115-.87-.009-1.605.003-2.02.21-.277.138-.49.446-.36.464.16.021.523.1.715.365.248.342.24 1.11.24 1.11s.143 2.13-.334 2.395c-.328.182-.777-.19-1.742-1.89-.494-.863-.867-1.817-.867-1.817s-.072-.18-.2-.276c-.155-.117-.372-.154-.372-.154l-2.29.015s-.344.01-.47.162c-.112.135-.009.413-.009.413s1.8 4.282 3.836 6.442c1.87 1.984 3.99 1.85 3.99 1.85h.964z" />
            </svg>
          </a>
        )}
        {settings.show_telegram && settings.telegram_url && (
          <a
            href={ensureProtocol(settings.telegram_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="Telegram"
          >
            <Send className="w-4 h-4" />
          </a>
        )}
        {settings.show_whatsapp && settings.whatsapp_url && (
          <a
            href={ensureProtocol(settings.whatsapp_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        )}
        {settings.show_youtube && settings.youtube_url && (
          <a
            href={ensureProtocol(settings.youtube_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="YouTube"
          >
            <Youtube className="w-4 h-4" />
          </a>
        )}
        {settings.show_instagram && settings.instagram_url && (
          <a
            href={ensureProtocol(settings.instagram_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
        )}
      </div>
    )
  }

  return (
    <>
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-18 items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              {settings?.logo_url ? (
                <div className="w-11 h-11 flex items-center justify-center">
                  <Image src={settings.logo_url} alt="БалтикЗемля" width={44} height={44} className="h-11 w-11 object-contain bg-transparent" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                  <TreePine className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
              <div>
                <span className="text-xl font-serif font-semibold tracking-tight">
                  {settings?.organization_name || "Baltland"}
                </span>
                <p className="text-xs text-muted-foreground -mt-0.5">Калининградская область</p>
              </div>
            </Link>

            {/* Desktop Location */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground border-l border-border/50 pl-8 h-8">
              <MapPin className="h-4 w-4" />
              <span>Калининград</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/50 transition-all"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-6">
            <SocialMediaIcons />
            <a
              href={`tel:${settings?.phone?.replace(/\D/g, "") || "+79316054484"}`}
              className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4" />
              {settings?.phone || "+7 931 605-44-84"}
            </a>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Открыть меню">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background/95 backdrop-blur-xl">
              <SheetTitle className="sr-only">Меню навигации</SheetTitle>
              <SheetDescription className="sr-only">Навигация по сайту</SheetDescription>
              <div className="flex flex-col gap-6 mt-8">
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-3 text-base font-medium rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-border pt-6 space-y-3">
                  <a
                    href={`tel:${settings?.phone?.replace(/\D/g, "") || "+79316054484"}`}
                    className="flex items-center gap-3 px-4 py-3 font-medium rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    {settings?.phone || "+7 931 605-44-84"}
                  </a>
                  <Button
                    className="w-full rounded-xl h-12"
                    onClick={() => {
                      setIsOpen(false)
                      resetViewingForm()
                      setIsViewingOpen(true)
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Записаться на просмотр
                  </Button>
                </div>

                {/* Social Media */}
                {settings && (
                  <div className="border-t border-border pt-6">
                    <div className="flex flex-wrap gap-2 px-4">
                      {settings.show_vk && settings.vk_url && (
                        <a
                          href={settings.vk_url.startsWith("http") ? settings.vk_url : `https://${settings.vk_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.578-1.496c.59-.19 1.346 1.26 2.148 1.818.606.422 1.067.33 1.067.33l2.144-.03s1.122-.07.59-.967c-.044-.073-.31-.663-1.597-1.875-1.349-1.27-1.168-1.064.456-3.26.99-1.338 1.385-2.154 1.262-2.503-.117-.333-.842-.245-.842-.245l-2.414.015s-.179-.025-.312.056c-.13.08-.214.265-.214.265s-.383 1.037-.893 1.918c-1.075 1.86-1.506 1.96-1.682 1.843-.41-.27-.307-1.086-.307-1.665 0-1.81.27-2.565-.527-2.76-.265-.065-.46-.108-1.138-.115-.87-.009-1.605.003-2.02.21-.277.138-.49.446-.36.464.16.021.523.1.715.365.248.342.24 1.11.24 1.11s.143 2.13-.334 2.395c-.328.182-.777-.19-1.742-1.89-.494-.863-.867-1.817-.867-1.817s-.072-.18-.2-.276c-.155-.117-.372-.154-.372-.154l-2.29.015s-.344.01-.47.162c-.112.135-.009.413-.009.413s1.8 4.282 3.836 6.442c1.87 1.984 3.99 1.85 3.99 1.85h.964z" />
                          </svg>
                          VK
                        </a>
                      )}
                      {settings.show_telegram && settings.telegram_url && (
                        <a
                          href={settings.telegram_url.startsWith("http") ? settings.telegram_url : `https://${settings.telegram_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Telegram
                        </a>
                      )}
                      {settings.show_whatsapp && settings.whatsapp_url && (
                        <a
                          href={settings.whatsapp_url.startsWith("http") ? settings.whatsapp_url : `https://${settings.whatsapp_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </a>
                      )}
                      {settings.show_youtube && settings.youtube_url && (
                        <a
                          href={settings.youtube_url.startsWith("http") ? settings.youtube_url : `https://${settings.youtube_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <Youtube className="w-4 h-4" />
                          YouTube
                        </a>
                      )}
                      {settings.show_instagram && settings.instagram_url && (
                        <a
                          href={settings.instagram_url.startsWith("http") ? settings.instagram_url : `https://${settings.instagram_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                          Instagram
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>

      {/* Viewing Request Dialog */}
      <Dialog open={isViewingOpen} onOpenChange={(open) => { setIsViewingOpen(open); if (!open) resetViewingForm() }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Записаться на просмотр</DialogTitle>
            <DialogDescription>
              Оставьте свои контактные данные и мы свяжемся с вами для согласования времени
            </DialogDescription>
          </DialogHeader>

          {viewingSuccess ? (
            <div className="py-6 text-center space-y-2">
              <div className="text-lg font-medium">Спасибо!</div>
              <div className="text-muted-foreground">Мы свяжемся с вами в ближайшее время.</div>
              <Button className="mt-4 rounded-xl" onClick={() => setIsViewingOpen(false)}>
                Закрыть
              </Button>
            </div>
          ) : (
            <form onSubmit={handleViewingSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="header-name">ФИО</Label>
                <Input
                  id="header-name"
                  value={viewingName}
                  onChange={(e) => setViewingName(e.target.value)}
                  placeholder="Иван Иванов"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="header-phone">Телефон *</Label>
                <Input
                  id="header-phone"
                  type="tel"
                  inputMode="numeric"
                  value={viewingPhone}
                  onChange={(e) => setViewingPhone(formatPhone(e.target.value))}
                  placeholder="+7 (___) ___-__-__"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Предпочтительный мессенджер</Label>
                <Select value={viewingMessenger} onValueChange={setViewingMessenger}>
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
                  <Label htmlFor="header-date">Желаемая дата</Label>
                  <Input
                    id="header-date"
                    type="date"
                    value={viewingDate}
                    onChange={(e) => setViewingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="header-time">Время</Label>
                  <Input
                    id="header-time"
                    type="time"
                    value={viewingTime}
                    onChange={(e) => setViewingTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="header-consent"
                  checked={viewingConsent}
                  onCheckedChange={(v) => setViewingConsent(Boolean(v))}
                />
                <label htmlFor="header-consent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                  Я ознакомлен(а) и согласен(на) с обработкой персональных данных
                </label>
              </div>

              {viewingError && <div className="text-sm text-destructive">{viewingError}</div>}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={viewingSubmitting} className="flex-1 rounded-xl">
                  {viewingSubmitting ? "Отправка..." : "Отправить заявку"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsViewingOpen(false)} disabled={viewingSubmitting} className="rounded-xl">
                  Отмена
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
