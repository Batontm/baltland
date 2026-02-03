"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, Building2, Award } from "lucide-react"

const stats = [
  { icon: TrendingUp, value: "+18%", label: "рост цен за год" },
  { icon: Users, value: "2 500+", label: "довольных клиентов" },
  { icon: Building2, value: "850+", label: "построенных домов" },
  { icon: Award, value: "12 лет", label: "на рынке региона" },
]

const reasons = [
  "Особая экономическая зона с налоговыми льготами для резидентов",
  "Единственный незамерзающий порт России на Балтике",
  "Мягкий морской климат с тёплой зимой и прохладным летом",
  "Развитая инфраструктура европейского уровня",
  "Близость к странам ЕС — 30 км до Польши и Литвы",
  "Активное развитие туристического кластера региона",
]

export function TrustSection() {
  return (
    <section id="trust" className="py-24 bg-gradient-to-b from-background to-secondary/30 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1">
              О регионе
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium mb-6 text-balance">
              Почему цены растут в Калининграде?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Калининградская область — самый западный регион России с уникальным географическим положением и
              инвестиционным потенциалом. Спрос на землю стабильно превышает предложение.
            </p>

            {/* Reasons List */}
            <ul className="space-y-4 mb-10">
              {reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-muted-foreground">{reason}</span>
                </li>
              ))}
            </ul>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-card border border-border/50 text-center group hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  <stat.icon className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-2xl font-serif font-semibold text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-primary/10">
              <Image
                src="/aerial-view-kaliningrad-baltic-sea-coast-pine-fore.jpg"
                alt="Калининградская область — вид на побережье"
                fill
                className="object-cover"
              />
              {/* Overlay Card */}
              <div className="absolute bottom-6 left-6 right-6 p-6 rounded-2xl bg-white/90 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-serif font-semibold">+156%</div>
                    <div className="text-sm text-muted-foreground">рост цен за 5 лет</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-secondary/50 blur-2xl animate-pulse-soft" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-primary/10 blur-xl animate-float-slow" />
          </div>
        </div>
      </div>
    </section>
  )
}
