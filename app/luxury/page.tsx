"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Zap,
  Waves,
  FileCheck,
  CreditCard,
  Star,
  Shield,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { useEffect, useState } from "react"
import { getOrganizationSettings } from "@/app/actions"
import type { OrganizationSettings } from "@/lib/types"

const plots = [
  { id: 1, price: "1 500 000", size: "8", location: "Зеленоградск", premium: false },
  { id: 2, price: "2 100 000", size: "10", location: "Светлогорск", premium: true },
  { id: 3, price: "1 800 000", size: "9", location: "Пионерский", premium: false },
  { id: 4, price: "2 400 000", size: "12", location: "Зеленоградск", premium: true },
  { id: 5, price: "1 350 000", size: "7", location: "Янтарный", premium: false },
  { id: 6, price: "1 950 000", size: "10", location: "Светлогорск", premium: false },
]

export default function LuxuryPage() {
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
  const emailDisplay = settings?.email || "info@baltland.ru"
  const emailHref = `mailto:${settings?.email || "info@baltland.ru"}`

  return (
    <main className="min-h-screen bg-[#0a0f0d] text-[#f5f5f0]">
      {/* Luxury Header with Gold Accent */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f0d]/90 backdrop-blur-md border-b border-[#2a3530]">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a962] to-[#8b7340] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[#0a0f0d]" />
            </div>
            <span className="text-xl font-serif tracking-wide">БАЛТИКА ЭЛИТ</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm tracking-wide">
            <a href="#catalog" className="text-[#a0a0a0] hover:text-[#c9a962] transition-colors">
              Каталог
            </a>
            <a href="#benefits" className="text-[#a0a0a0] hover:text-[#c9a962] transition-colors">
              Преимущества
            </a>
            <a href="#contact" className="text-[#a0a0a0] hover:text-[#c9a962] transition-colors">
              Контакты
            </a>
          </nav>
          <Button
            variant="outline"
            className="border-[#c9a962] text-[#c9a962] hover:bg-[#c9a962] hover:text-[#0a0f0d] rounded-none bg-transparent"
          >
            <Phone className="h-4 w-4 mr-2" />
            Связаться
          </Button>
        </div>
      </header>

      {/* Hero - Full Screen Luxury */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23c9a962' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1a4035] rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1a3550] rounded-full blur-3xl opacity-30" />

        <div className="relative z-10 text-center px-8 max-w-5xl">
          <Badge className="bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30 mb-8 px-4 py-1 rounded-none tracking-widest text-xs">
            ЭКСКЛЮЗИВНОЕ ПРЕДЛОЖЕНИЕ
          </Badge>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif tracking-tight leading-none">
            Земельные участки
            <br />
            <span className="bg-gradient-to-r from-[#c9a962] via-[#e8d5a3] to-[#c9a962] bg-clip-text text-transparent">
              премиум-класса
            </span>
          </h1>
          <p className="mt-8 text-xl text-[#a0a0a0] max-w-2xl mx-auto leading-relaxed">
            Калининградское побережье Балтийского моря. Инвестиции в будущее с гарантированной доходностью.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#c9a962] to-[#a08040] hover:from-[#d4b46d] hover:to-[#b08a4a] text-[#0a0f0d] rounded-none px-10 h-14 text-base tracking-wide"
            >
              Выбрать участок
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-[#2a3530] text-[#f5f5f0] hover:bg-[#1a2520] rounded-none px-10 h-14 text-base tracking-wide bg-transparent"
            >
              Скачать каталог
            </Button>
          </div>

          {/* Stats Row */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-xl mx-auto">
            {[
              { value: "47%", label: "Рост за 3 года" },
              { value: "6", label: "Участков в продаже" },
              { value: "5 км", label: "До моря" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-serif text-[#c9a962]">{stat.value}</p>
                <p className="text-sm text-[#707070] mt-1 tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs tracking-widest text-[#606060]">ЛИСТАТЬ</span>
          <ChevronRight className="h-5 w-5 text-[#606060] rotate-90" />
        </div>
      </section>

      {/* Benefits - Luxury Grid */}
      <section id="benefits" className="py-32 px-8 border-t border-[#2a3530]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <Badge className="bg-transparent text-[#c9a962] border-[#c9a962]/30 mb-4 rounded-none tracking-widest text-xs">
              ПРЕИМУЩЕСТВА
            </Badge>
            <h2 className="text-4xl md:text-5xl font-serif">Почему выбирают нас</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: "Газ и Свет", desc: "Все коммуникации подведены к границе участка" },
              { icon: Waves, title: "5 км до моря", desc: "Пешая доступность до Балтийского побережья" },
              { icon: FileCheck, title: "Статус ИЖС", desc: "Полный пакет документов для строительства" },
              { icon: CreditCard, title: "Рассрочка 0%", desc: "Беспроцентная рассрочка до 24 месяцев" },
            ].map((b, i) => (
              <Card
                key={i}
                className="bg-[#12181a] border-[#2a3530] rounded-none group hover:border-[#c9a962]/50 transition-all duration-500"
              >
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a4035] to-[#1a3550] flex items-center justify-center mb-6 group-hover:from-[#c9a962]/20 group-hover:to-[#c9a962]/10 transition-all duration-500">
                    <b.icon className="h-6 w-6 text-[#c9a962]" />
                  </div>
                  <h3 className="text-xl font-serif mb-2">{b.title}</h3>
                  <p className="text-[#707070] text-sm leading-relaxed">{b.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog - Premium Cards */}
      <section id="catalog" className="py-32 px-8 bg-[#0d1210]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div>
              <Badge className="bg-transparent text-[#c9a962] border-[#c9a962]/30 mb-4 rounded-none tracking-widest text-xs">
                КАТАЛОГ
              </Badge>
              <h2 className="text-4xl md:text-5xl font-serif">Доступные участки</h2>
            </div>
            <p className="text-[#707070] max-w-md mt-4 md:mt-0">
              Эксклюзивная подборка земельных участков в лучших локациях Калининградской области
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plots.map((plot) => (
              <Card
                key={plot.id}
                className="bg-[#12181a] border-[#2a3530] rounded-none overflow-hidden group hover:border-[#c9a962]/50 transition-all duration-500"
              >
                <div className="relative h-56 bg-gradient-to-br from-[#1a4035] to-[#1a3550] overflow-hidden">
                  <img
                    src={`/luxury-pine-forest-baltic-sea-aerial-view-plot-.jpg?height=224&width=400&query=luxury pine forest Baltic sea aerial view plot ${plot.id}`}
                    alt={plot.location}
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                  />
                  {plot.premium && (
                    <Badge className="absolute top-4 right-4 bg-[#c9a962] text-[#0a0f0d] rounded-none">
                      <Star className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-[#707070] text-sm mb-3">
                    <MapPin className="h-4 w-4" />
                    {plot.location}
                  </div>
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-3xl font-serif text-[#c9a962]">{plot.price}</p>
                      <p className="text-sm text-[#707070]">рублей</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-serif">{plot.size}</p>
                      <p className="text-sm text-[#707070]">соток</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-[#2a3530] hover:border-[#c9a962] hover:bg-[#c9a962]/10 rounded-none group-hover:border-[#c9a962] bg-transparent"
                  >
                    Подробнее
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section - Luxury Stats */}
      <section className="py-32 px-8 border-y border-[#2a3530] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a4035]/30 via-transparent to-[#1a3550]/30" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="bg-transparent text-[#c9a962] border-[#c9a962]/30 mb-4 rounded-none tracking-widest text-xs">
                ИНВЕСТИЦИИ
              </Badge>
              <h2 className="text-4xl md:text-5xl font-serif mb-6">
                Почему Калининград —<span className="text-[#c9a962]"> золотая</span> инвестиция
              </h2>
              <p className="text-[#a0a0a0] leading-relaxed mb-8">
                Калининградская область демонстрирует стабильный рост стоимости земельных участков благодаря уникальному
                географическому положению, развитой инфраструктуре и растущему туристическому потоку.
              </p>
              <div className="space-y-4">
                {[
                  { icon: TrendingUp, text: "Рост стоимости +15-20% ежегодно" },
                  { icon: Shield, text: "Юридическая чистота всех сделок" },
                  { icon: Star, text: "Премиальные локации у моря" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#c9a962]/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-[#c9a962]" />
                    </div>
                    <span className="text-[#d0d0d0]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "+47%", label: "За 3 года" },
                { value: "№1", label: "Регион по росту" },
                { value: "200+", label: "Довольных клиентов" },
                { value: "15 лет", label: "На рынке" },
              ].map((stat, i) => (
                <div key={i} className="bg-[#12181a] border border-[#2a3530] p-8 text-center">
                  <p className="text-4xl md:text-5xl font-serif text-[#c9a962] mb-2">{stat.value}</p>
                  <p className="text-sm text-[#707070] tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form - Premium */}
      <section id="contact" className="py-32 px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-transparent text-[#c9a962] border-[#c9a962]/30 mb-4 rounded-none tracking-widest text-xs">
              КОНТАКТЫ
            </Badge>
            <h2 className="text-4xl md:text-5xl font-serif mb-4">Получите персональную консультацию</h2>
            <p className="text-[#707070]">Наш эксперт свяжется с вами в течение 30 минут</p>
          </div>

          <Card className="bg-[#12181a] border-[#2a3530] rounded-none">
            <CardContent className="p-10">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#c9a962]/20 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="h-8 w-8 text-[#c9a962]" />
                  </div>
                  <h3 className="text-2xl font-serif mb-2">Благодарим за обращение</h3>
                  <p className="text-[#707070]">Наш менеджер свяжется с вами в ближайшее время</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setSubmitted(true)
                  }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm text-[#707070] tracking-wide mb-2 block">ИМЯ</label>
                      <Input
                        placeholder="Введите ваше имя"
                        className="bg-[#0a0f0d] border-[#2a3530] rounded-none h-14 focus:border-[#c9a962]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[#707070] tracking-wide mb-2 block">ТЕЛЕФОН</label>
                      <Input
                        placeholder="+7 (___) ___-__-__"
                        type="tel"
                        className="bg-[#0a0f0d] border-[#2a3530] rounded-none h-14 focus:border-[#c9a962]"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#c9a962] to-[#a08040] hover:from-[#d4b46d] hover:to-[#b08a4a] text-[#0a0f0d] rounded-none h-14 text-base tracking-wide"
                  >
                    Получить консультацию
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <p className="text-xs text-[#505050] text-center">
                    Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer - Luxury */}
      <footer className="border-t border-[#2a3530] py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a962] to-[#8b7340] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[#0a0f0d]" />
                </div>
                <span className="text-xl font-serif tracking-wide">БАЛТИКА ЭЛИТ</span>
              </div>
              <p className="text-[#707070] max-w-sm leading-relaxed">
                Премиальные земельные участки на побережье Балтийского моря. Надежные инвестиции в вашу недвижимость.
              </p>
            </div>
            <div>
              <h4 className="text-sm tracking-widest text-[#505050] mb-4">НАВИГАЦИЯ</h4>
              <nav className="space-y-3">
                <a href="#" className="block text-[#a0a0a0] hover:text-[#c9a962] transition-colors">
                  Каталог
                </a>
                <a href="#" className="block text-[#a0a0a0] hover:text-[#c9a962] transition-colors">
                  О компании
                </a>
                <a href="#" className="block text-[#a0a0a0] hover:text-[#c9a962] transition-colors">
                  Контакты
                </a>
              </nav>
            </div>
            <div>
              <h4 className="text-sm tracking-widest text-[#505050] mb-4">КОНТАКТЫ</h4>
              <div className="space-y-3 text-[#a0a0a0]">
                <a href={phoneHref} className="flex items-center gap-2 hover:text-[#c9a962] transition-colors">
                  <Phone className="h-4 w-4" />
                  {phoneDisplay}
                </a>
                <a href={emailHref} className="flex items-center gap-2 hover:text-[#c9a962] transition-colors">
                  <Mail className="h-4 w-4" />
                  {emailDisplay}
                </a>
              </div>
            </div>
          </div>
          <Separator className="bg-[#2a3530]" />
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-[#505050]">
            <span>© 2025 Балтика Элит. Все права защищены.</span>
            <a href="#" className="hover:text-[#a0a0a0] transition-colors mt-2 md:mt-0">
              Политика конфиденциальности
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
