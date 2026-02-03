"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Phone, Mail, MapPin } from "lucide-react"

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
  }

  return (
    <section id="contact" className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Связаться с нами</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6 text-balance">
              Получите бесплатную презентацию участков
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Оставьте заявку, и наш менеджер свяжется с вами в течение 15 минут. Мы подберём участок под ваши
              требования и бюджет.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Телефон</p>
                  <p className="font-medium text-foreground">+7 931 605-44-84</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">info@baltland.ru</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Офис</p>
                  <p className="font-medium text-foreground">Калининградская обл, Калининград, ул. Брамса, 40</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-2xl bg-card">
            <CardContent className="p-8">
              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">Заявка отправлена!</h3>
                  <p className="text-muted-foreground">Наш менеджер свяжется с вами в ближайшее время.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-card-foreground">
                      Ваше имя
                    </Label>
                    <Input
                      id="name"
                      placeholder="Иван Иванов"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-card-foreground">
                      Телефон
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+7 (___) ___-__-__"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full text-base">
                    Получить презентацию
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Нажимая кнопку, вы соглашаетесь с{" "}
                    <a href="#" className="text-primary hover:underline">
                      политикой конфиденциальности
                    </a>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
