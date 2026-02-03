"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Phone, ArrowRight, Zap, Waves, FileCheck, CreditCard } from "lucide-react"
import { useEffect, useState } from "react"
import { getOrganizationSettings } from "@/app/actions"
import type { OrganizationSettings } from "@/lib/types"

const plots = [
  { id: 1, price: "1 500 000", size: "8", location: "Зеленоградск" },
  { id: 2, price: "2 100 000", size: "10", location: "Светлогорск" },
  { id: 3, price: "1 800 000", size: "9", location: "Пионерский" },
  { id: 4, price: "2 400 000", size: "12", location: "Зеленоградск" },
  { id: 5, price: "1 350 000", size: "7", location: "Янтарный" },
  { id: 6, price: "1 950 000", size: "10", location: "Светлогорск" },
]

const benefits = [
  { icon: Zap, title: "Газ и Свет", desc: "Подведены" },
  { icon: Waves, title: "5 км", desc: "До моря" },
  { icon: FileCheck, title: "ИЖС", desc: "Статус" },
  { icon: CreditCard, title: "Рассрочка", desc: "0%" },
]

export default function MinimalistPage() {
  const [submitted, setSubmitted] = useState(false)
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      const orgSettings = await getOrganizationSettings()
      setSettings(orgSettings)
    }
    loadSettings()
  }, [])

  const phoneDisplay = settings?.phone || "+7 931 605-44-84"
  const phoneHref = `tel:${settings?.phone?.replace(/\D/g, "") || "+79316054484"}`

  return (
    <main className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-medium tracking-tight">Балтика.Земля</span>
          <a href={phoneHref} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {phoneDisplay}
          </a>
        </div>
      </header>

      {/* Hero - Ultra Minimal */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-medium tracking-tight text-balance leading-tight">
            Земельные участки
            <br />
            <span className="text-primary">у моря</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto">
            Калининградская область. Инвестиции в недвижимость с гарантированным ростом стоимости.
          </p>
          <Button size="lg" className="mt-10 rounded-full px-8">
            Выбрать участок
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Benefits - Horizontal Strip */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <b.icon className="h-5 w-5 text-primary" />
                <div>
                  <span className="font-medium">{b.title}</span>
                  <span className="text-muted-foreground ml-1 text-sm">{b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog - Clean List */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-serif mb-12 text-center">Каталог участков</h2>
          <div className="space-y-4">
            {plots.map((plot) => (
              <div
                key={plot.id}
                className="flex items-center justify-between p-6 border border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 rounded-md bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{plot.location}</p>
                    <p className="text-sm text-muted-foreground">{plot.size} соток</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <span className="text-xl font-medium">{plot.price} ₽</span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Invest - Simple Text */}
      <section className="py-24 px-6 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-5xl md:text-7xl font-serif font-medium">+47%</p>
          <p className="mt-4 text-lg opacity-90">Рост стоимости земли в Калининградской области за последние 3 года</p>
        </div>
      </section>

      {/* Contact - Minimal Form */}
      <section className="py-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-serif mb-2">Получить консультацию</h2>
          <p className="text-muted-foreground mb-8">Оставьте контакт и мы перезвоним</p>

          {submitted ? (
            <p className="text-primary font-medium py-8">Спасибо! Мы свяжемся с вами.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSubmitted(true)
              }}
              className="space-y-4"
            >
              <Input placeholder="Имя" className="h-12 rounded-full px-6" required />
              <Input placeholder="Телефон" type="tel" className="h-12 rounded-full px-6" required />
              <Button type="submit" className="w-full h-12 rounded-full">
                Отправить
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© 2025 Балтика.Земля</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground transition-colors">
              Политика конфиденциальности
            </a>
            <a href={phoneHref} className="hover:text-foreground transition-colors flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {phoneDisplay}
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
