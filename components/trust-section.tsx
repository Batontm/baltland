import { TrendingUp, Building2, Plane, Shield } from "lucide-react"

const reasons = [
  {
    icon: TrendingUp,
    title: "Рост цен на 15-20% в год",
    description: "За последние 5 лет стоимость земли в Калининградской области выросла более чем в 2 раза.",
  },
  {
    icon: Building2,
    title: "Развитие инфраструктуры",
    description: "Активное строительство дорог, школ, больниц и торговых центров в регионе.",
  },
  {
    icon: Plane,
    title: "Туристический потенциал",
    description: "Растущий поток туристов создаёт спрос на аренду и гостиничный бизнес.",
  },
  {
    icon: Shield,
    title: "Особая экономическая зона",
    description: "Налоговые льготы для резидентов ОЭЗ привлекают крупные инвестиции в регион.",
  },
]

export function TrustSection() {
  return (
    <section id="about" className="py-20 md:py-32 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-medium text-primary-foreground/70 uppercase tracking-wider mb-3">
              Инвестиции в будущее
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6 leading-tight text-balance">
              Почему цены на землю в Калининграде растут?
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed mb-8">
              Калининградская область — уникальный регион России с европейским климатом, выходом к морю и статусом
              особой экономической зоны. Ограниченное предложение земли и растущий спрос делают инвестиции в
              недвижимость здесь особенно выгодными.
            </p>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-4xl font-bold">+127%</p>
                <p className="text-sm text-primary-foreground/70">Рост за 5 лет</p>
              </div>
              <div>
                <p className="text-4xl font-bold">№1</p>
                <p className="text-sm text-primary-foreground/70">По темпам роста в РФ</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {reasons.map((reason, index) => (
              <div key={index} className="p-6 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center mb-4">
                  <reason.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{reason.title}</h3>
                <p className="text-sm text-primary-foreground/70 leading-relaxed">{reason.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
