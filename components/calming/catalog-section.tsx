"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Ruler, Zap, Flame, Share2, ArrowRight, Grid3X3, List } from "lucide-react"
import { SharePopup } from "@/components/ui/share-popup"

const plots = [
  {
    id: 1,
    image: "/aerial-view-green-land-plot-near-baltic-sea-forest.jpg",
    price: 3240000,
    pricePerSotka: 379836,
    size: 8.53,
    location: "Зеленоградск, пер Заводской",
    status: "ИЖС",
    hasGas: true,
    hasElectric: true,
    toSea: "3.2 км",
    isNew: true,
    isFavorite: false,
  },
  {
    id: 2,
    image: "/sunny-meadow-land-plot-pine-trees-kaliningrad.jpg",
    price: 2777000,
    pricePerSotka: 379891,
    size: 7.31,
    location: "Зеленоградск, пер Заводской",
    status: "ИЖС",
    hasGas: true,
    hasElectric: true,
    toSea: "3.5 км",
    isNew: false,
    isFavorite: true,
  },
  {
    id: 3,
    image: "/green-grass-land-near-sea-coast-lithuania-border.jpg",
    price: 1890000,
    pricePerSotka: 315000,
    size: 6,
    location: "Пионерский, ул Садовая",
    status: "ИЖС",
    hasGas: false,
    hasElectric: true,
    toSea: "1.8 км",
    isNew: true,
    isFavorite: false,
  },
  {
    id: 4,
    image: "/autumn-forest-clearing-land-plot-for-building-hous.jpg",
    price: 4500000,
    pricePerSotka: 375000,
    size: 12,
    location: "Светлогорск, пос Отрадное",
    status: "ИЖС",
    hasGas: true,
    hasElectric: true,
    toSea: "2.1 км",
    isNew: false,
    isFavorite: false,
  },
  {
    id: 5,
    image: "/spring-green-land-plot-with-wildflowers-baltic-reg.jpg",
    price: 2100000,
    pricePerSotka: 262500,
    size: 8,
    location: "Янтарный, ул Приморская",
    status: "СНТ",
    hasGas: false,
    hasElectric: true,
    toSea: "0.8 км",
    isNew: false,
    isFavorite: true,
  },
  {
    id: 6,
    image: "/summer-evening-land-plot-near-lake-pine-forest.jpg",
    price: 5200000,
    pricePerSotka: 346667,
    size: 15,
    location: "Зеленоградск, пос Куршская",
    status: "ИЖС",
    hasGas: true,
    hasElectric: true,
    toSea: "4.5 км",
    isNew: true,
    isFavorite: false,
  },
]

function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU") + " ₽"
}

export function CatalogSection() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  return (
    <section id="catalog" className="py-20 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1">
              Каталог
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium">{plots.length} участков в продаже</h2>
            <p className="text-muted-foreground mt-2">Актуальные предложения на сегодня</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Вид:</span>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-xl"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-xl"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plots.map((plot, index) => (
              <Card
                key={plot.id}
                className="group overflow-hidden rounded-3xl border-border/50 bg-card hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={plot.image}
                    alt={plot.location}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {plot.isNew && <Badge className="bg-primary/90 backdrop-blur-sm rounded-full">Новый</Badge>}
                    <Badge variant="secondary" className="backdrop-blur-sm rounded-full bg-white/90 text-foreground">
                      {plot.status}
                    </Badge>
                  </div>

                  {/* Share Button */}
                  <SharePopup
                    url={`/plot/demo-${plot.id}`}
                    title={`Участок ${plot.status}`}
                    price={plot.price}
                    area={plot.size}
                    location={plot.location}
                    className="absolute top-4 right-4"
                  />

                  {/* Price Per Sotka */}
                  <div className="absolute bottom-4 left-4">
                    <span className="text-xs text-white/80 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      {formatPrice(plot.pricePerSotka)} за сотку
                    </span>
                  </div>
                </div>

                <CardContent className="p-6">
                  {/* Location */}
                  <div className="flex items-start gap-2 text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="text-sm line-clamp-1">{plot.location}</span>
                  </div>

                  {/* Title / Size */}
                  <h3 className="text-lg font-semibold mb-4">Земля под ИЖС, {plot.size} сотки</h3>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                      <Ruler className="h-3.5 w-3.5" />
                      {plot.size} соток
                    </div>
                    {plot.hasGas && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                        <Flame className="h-3.5 w-3.5" />
                        Газ
                      </div>
                    )}
                    {plot.hasElectric && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                        <Zap className="h-3.5 w-3.5" />
                        Свет
                      </div>
                    )}
                  </div>

                  {/* Price & Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div>
                      <span className="text-2xl font-serif font-semibold">{formatPrice(plot.price)}</span>
                    </div>
                    <Button variant="outline" className="rounded-xl group/btn bg-transparent">
                      Подробнее
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {plots.map((plot, index) => (
              <Card
                key={plot.id}
                className="group overflow-hidden rounded-2xl border-border/50 bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="relative w-full md:w-80 aspect-video md:aspect-auto shrink-0">
                    <Image src={plot.image} alt={plot.location} fill className="object-cover" />
                    {plot.isNew && (
                      <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm rounded-full">Новый</Badge>
                    )}
                    <span className="absolute bottom-3 left-3 text-xs text-white/90 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      {formatPrice(plot.pricePerSotka)} за сотку
                    </span>
                  </div>

                  {/* Content */}
                  <CardContent className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold">
                          Земля под {plot.status}, {plot.size} сотки
                        </h3>
                        <SharePopup
                          url={`/plot/demo-${plot.id}`}
                          title={`Участок ${plot.status}`}
                          price={plot.price}
                          area={plot.size}
                          location={plot.location}
                        />
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground mb-4">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{plot.location}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="rounded-full">
                          {plot.status}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          {plot.size} соток
                        </Badge>
                        {plot.hasGas && (
                          <Badge variant="outline" className="rounded-full">
                            Газ
                          </Badge>
                        )}
                        {plot.hasElectric && (
                          <Badge variant="outline" className="rounded-full">
                            Свет
                          </Badge>
                        )}
                        <Badge variant="outline" className="rounded-full">
                          {plot.toSea} до моря
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                      <span className="text-2xl font-serif font-semibold">{formatPrice(plot.price)}</span>
                      <div className="flex gap-3">
                        <Button variant="outline" className="rounded-xl bg-transparent">
                          Показать телефон
                        </Button>
                        <Button className="rounded-xl">
                          Подробнее
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="rounded-2xl px-10 bg-transparent">
            Показать ещё 12 участков
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  )
}
