import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Maximize2 } from "lucide-react"

const plots = [
  {
    id: 1,
    image: "/green-meadow-pine-trees-land-plot-aerial-view.jpg",
    price: "1 500 000 ₽",
    size: "8 соток",
    location: "Зеленоградск",
    badge: "Популярный",
  },
  {
    id: 2,
    image: "/forest-clearing-land-plot-nature-birch-trees.jpg",
    price: "1 850 000 ₽",
    size: "10 соток",
    location: "Светлогорск",
    badge: null,
  },
  {
    id: 3,
    image: "/seaside-land-plot-baltic-coast-dunes-grass.jpg",
    price: "2 200 000 ₽",
    size: "12 соток",
    location: "Янтарный",
    badge: "У моря",
  },
  {
    id: 4,
    image: "/green-field-rural-land-plot-countryside.jpg",
    price: "1 200 000 ₽",
    size: "6 соток",
    location: "Пионерский",
    badge: null,
  },
  {
    id: 5,
    image: "/pine-forest-land-plot-nature-peaceful.jpg",
    price: "1 950 000 ₽",
    size: "15 соток",
    location: "Зеленоградск",
    badge: "Большой",
  },
  {
    id: 6,
    image: "/lakeside-land-plot-water-trees-scenic.jpg",
    price: "2 800 000 ₽",
    size: "20 соток",
    location: "Светлогорск",
    badge: "Премиум",
  },
]

export function CatalogSection() {
  return (
    <section id="catalog" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Каталог</p>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Выберите свой участок
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Актуальные предложения земельных участков в лучших локациях Калининградской области
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plots.map((plot) => (
            <Card
              key={plot.id}
              className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-card group"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={plot.image}
                  alt={`Участок в ${plot.location}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {plot.badge && (
                  <Badge className="absolute top-4 left-4 bg-secondary text-secondary-foreground">{plot.badge}</Badge>
                )}
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-2xl font-bold text-primary">{plot.price}</p>
                </div>
                <div className="flex items-center gap-4 mb-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Maximize2 className="h-4 w-4" />
                    <span className="text-sm">{plot.size}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{plot.location}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Подробнее
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline" className="px-8 bg-transparent">
            Показать все участки
          </Button>
        </div>
      </div>
    </section>
  )
}
