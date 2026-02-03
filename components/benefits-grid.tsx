import { Card, CardContent } from "@/components/ui/card"
import { Flame, Waves, Home, CreditCard } from "lucide-react"

const benefits = [
  {
    icon: Flame,
    title: "Газ и Свет",
    description: "Все коммуникации подведены к границе участка. Подключение в течение 30 дней.",
  },
  {
    icon: Waves,
    title: "5 км до моря",
    description: "Пляжи Балтийского моря в пешей доступности. Чистый воздух и сосновый лес.",
  },
  {
    icon: Home,
    title: "ИЖС статус",
    description: "Земли населённых пунктов для индивидуального жилищного строительства.",
  },
  {
    icon: CreditCard,
    title: "Рассрочка",
    description: "Беспроцентная рассрочка до 24 месяцев. Первоначальный взнос от 30%.",
  },
]

export function BenefitsGrid() {
  return (
    <section id="benefits" className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Почему мы</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Преимущества наших участков
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Мы предлагаем только проверенные участки с полным комплектом документов и готовой инфраструктурой
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-card">
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <benefit.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-xl text-card-foreground mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
