"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { TreePine, Phone, Mail, MapPin, CheckCircle, Youtube, Instagram, MessageCircle, Send } from "lucide-react"
import { getOrganizationSettings } from "@/app/actions"
import type { OrganizationSettings } from "@/lib/types"

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [email, setEmail] = useState("")
  const [subscribeState, setSubscribeState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      const orgSettings = await getOrganizationSettings()
      setSettings(orgSettings)
    }
    loadSettings()
  }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSubscribeState("loading")
    setErrorMessage("")

    try {
      const res = await fetch("/api/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await res.json().catch(() => ({}))

      if (res.ok && result.success) {
        setSubscribeState("success")
        setEmail("")
      } else {
        setSubscribeState("error")
        setErrorMessage(result.error || "Ошибка подписки")
      }
    } catch (error) {
      setSubscribeState("error")
      setErrorMessage("Ошибка соединения")
    }
  }

  const links = {
    collections: [
      { label: "Недорогие участки (до 500 тыс.)", href: "/catalog?maxPrice=500000" },
      { label: "Участки под ИЖС", href: "/catalog?landStatus=ИЖС" },
      { label: "Рядом с городом", href: "/catalog?district=Гурьевский" },
      { label: "Участки с коммуникациями", href: "/catalog?utilities=full" },
      { label: "Новинки месяца", href: "/catalog?isNew=true" },
      { label: "Участки в рассрочку", href: "/catalog?installment=yes" },
    ],
    company: [
      { label: "О компании", href: "/about" },
      { label: "Помощь покупателю", href: "/faq" },
      { label: "Контакты", href: "/#contact" },
    ],
    legal: [
      { label: "Политика конфиденциальности", href: "/privacy" },
      { label: "Договор оферты", href: "/terms" },
    ],
  }

  const SocialMediaIcons = () => {
    if (!settings?.show_social_media) return null

    const ensureProtocol = (url: string) => {
      if (!url) return ""
      return url.startsWith("http") ? url : `https://${url}`
    }

    return (
      <div className="flex items-center gap-3 mt-4">
        {settings.show_vk && settings.vk_url && (
          <a
            href={ensureProtocol(settings.vk_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors"
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
            className="w-9 h-9 rounded-lg bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors"
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
            className="w-9 h-9 rounded-lg bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors"
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
            className="w-9 h-9 rounded-lg bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors"
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
            className="w-9 h-9 rounded-lg bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
        )}
      </div>
    )
  }

  return (
    <footer className="bg-foreground text-background pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-background/10">
          {/* Logo & Description */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-5">
              {settings?.logo_url ? (
                <div className="w-11 h-11 flex items-center justify-center">
                  <img src={settings.logo_url} alt="logo" className="h-11 w-11 object-contain bg-transparent" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center">
                  <TreePine className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
              <span className="text-xl font-serif font-semibold">{settings?.organization_name || "Baltland"}</span>
            </Link>
            <p className="text-background/60 text-sm leading-relaxed mb-6">
              Продажа земельных участков в Калининградской области. Более 12 лет помогаем людям обрести свой уголок у
              Балтийского моря.
            </p>
            <div className="space-y-3">
              <a
                href={`tel:${settings?.phone?.replace(/\D/g, "") || "+79316054484"}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4" />
                {settings?.phone || "+7 931 605-44-84"}
              </a>
              <a
                href={`mailto:${settings?.email || "info@baltland.ru"}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                {settings?.email || "info@baltland.ru"}
              </a>
              <a
                href={`https://yandex.ru/maps/?rtext=~${encodeURIComponent(
                  settings?.address || "Калининград, ул. Брамса, 40",
                )}&rtt=auto`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-sm text-background/60 hover:text-primary transition-colors"
              >
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                {settings?.address || "Калининград, ул. Брамса, 40"}
              </a>
            </div>
            <SocialMediaIcons />
          </div>

          <div>
            <h4 className="font-semibold mb-5">Популярные подборки</h4>
            <ul className="space-y-3">
              {links.collections.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-5">Компания</h4>
            <ul className="space-y-3">
              {links.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/60 hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter - Connected to database */}
          <div>
            <h4 className="font-semibold mb-5">Подпишитесь</h4>
            <p className="text-sm text-background/60 mb-4">
              Получайте уведомления о новых участках и специальных предложениях
            </p>

            {subscribeState === "success" ? (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Вы подписаны!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 px-4 py-2.5 rounded-xl bg-background/10 border-0 text-sm placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="submit"
                    disabled={subscribeState === "loading"}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {subscribeState === "loading" ? "..." : "OK"}
                  </button>
                </div>
                {subscribeState === "error" && <p className="text-xs text-red-400">{errorMessage}</p>}
              </form>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-sm text-background/50">
            © {currentYear} {settings?.organization_name || "Baltland"}. Все права защищены.
          </p>
          <div className="flex gap-6">
            {links.legal.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-background/50 hover:text-background transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
