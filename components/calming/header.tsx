"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Phone, MapPin, TreePine, Youtube, Instagram, MessageCircle, Send } from "lucide-react"
import { getOrganizationSettings } from "@/app/actions"
import type { OrganizationSettings } from "@/lib/types"

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      const orgSettings = await getOrganizationSettings()
      setSettings(orgSettings)
    }
    loadSettings()
  }, [])

  const navItems = [
    { label: "Каталог", href: "/#catalog" },
    { label: "Новости", href: "/#news" },
    { label: "Помощь покупателю", href: "/faq" },
    { label: "Контакты", href: "/#contact" },
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
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-18 items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              {settings?.logo_url ? (
                <div className="w-11 h-11 flex items-center justify-center">
                  <img src={settings.logo_url} alt="logo" className="h-11 w-11 object-contain bg-transparent" />
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
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background/95 backdrop-blur-xl">
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
                <div className="border-t border-border pt-6">
                  <a
                    href={`tel:${settings?.phone?.replace(/\D/g, "") || "+79316054484"}`}
                    className="flex items-center gap-3 px-4 py-3 font-medium"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    {settings?.phone || "+7 931 605-44-84"}
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
