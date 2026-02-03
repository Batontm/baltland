import { Button } from "@/components/ui/button"
import { ChevronRight, MapPin } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img src="/baltic-sea-coast-pine-forest-aerial-view-nature-la.jpg" alt="Побережье Балтийского моря" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 backdrop-blur-sm rounded-full mb-6">
            <MapPin className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm text-primary-foreground">Калининградская область</span>
          </div>

          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight text-balance">
            Земельные участки у моря в Калининграде
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 leading-relaxed max-w-xl">
            Инвестируйте в будущее — земля в самом западном регионе России. Уникальная возможность приобрести участок с
            коммуникациями в 5 км от моря.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="text-base px-8">
              Выбрать участок
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 bg-background/10 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 hover:text-primary-foreground"
            >
              Смотреть видео
            </Button>
          </div>

          <div className="flex items-center gap-8 mt-12 pt-8 border-t border-primary-foreground/20">
            <div>
              <p className="text-3xl font-bold text-primary-foreground">150+</p>
              <p className="text-sm text-primary-foreground/70">Участков в продаже</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary-foreground">5 км</p>
              <p className="text-sm text-primary-foreground/70">До побережья</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
