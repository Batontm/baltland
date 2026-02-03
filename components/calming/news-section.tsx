"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react"
import Image from "next/image"
import type { News } from "@/lib/types"
import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import Link from "next/link"

interface NewsSectionProps {
  news: News[]
}

export function NewsSection({ news }: NewsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [filteredNews, setFilteredNews] = useState<News[]>([])

  useEffect(() => {
    const filtered = news.filter((item) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase())

      // Date filter
      let matchesDate = true
      if (item.published_at && (dateRange.from || dateRange.to)) {
        const publishedDate = new Date(item.published_at)
        if (dateRange.from && publishedDate < dateRange.from) matchesDate = false
        if (dateRange.to && publishedDate > dateRange.to) matchesDate = false
      }

      return matchesSearch && matchesDate
    })

    setFilteredNews(filtered)
  }, [news, searchQuery, dateRange])

  const infiniteNews = [...filteredNews, ...filteredNews, ...filteredNews]

  const handleScroll = () => {
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const scrollLeft = container.scrollLeft
    const scrollWidth = container.scrollWidth / 3 // Divide by 3 because we tripled the content

    // If scrolled past the end of second copy, jump back to first copy
    if (scrollLeft >= scrollWidth * 2) {
      container.scrollLeft = scrollLeft - scrollWidth
    }
    // If scrolled before the beginning of second copy, jump to third copy
    else if (scrollLeft <= 0) {
      container.scrollLeft = scrollLeft + scrollWidth
    }
  }

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const firstCard = container.querySelector('article')
      if (firstCard) {
        const cardWidth = firstCard.offsetWidth
        const gap = 16 // gap-4 = 16px on mobile
        container.scrollBy({ left: -(cardWidth + gap), behavior: "smooth" })
      }
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const firstCard = container.querySelector('article')
      if (firstCard) {
        const cardWidth = firstCard.offsetWidth
        const gap = 16 // gap-4 = 16px on mobile
        container.scrollBy({ left: cardWidth + gap, behavior: "smooth" })
      }
    }
  }

  useEffect(() => {
    if (scrollContainerRef.current && filteredNews.length > 0) {
      const container = scrollContainerRef.current
      const scrollWidth = container.scrollWidth / 3
      container.scrollLeft = scrollWidth
    }
  }, [filteredNews.length])

  if (!filteredNews || filteredNews.length === 0) return null

  return (
    <section id="news" className="py-24 bg-background relative overflow-hidden">
      {/* Floating Decorations */}
      <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-accent/10 blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-primary/5 blur-3xl animate-float-slow" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="mb-10">
          <Badge variant="secondary" className="rounded-full px-4 py-1">
            Новости
          </Badge>
        </div>

        <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск по новостям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-2xl border-border/50 focus:border-primary/50"
            />
          </div>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-12 rounded-2xl border-border/50 hover:border-primary/50 min-w-[200px] bg-transparent"
              >
                <Calendar className="mr-2 h-5 w-5" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd.MM.yy", { locale: ru })} -{" "}
                      {format(dateRange.to, "dd.MM.yy", { locale: ru })}
                    </>
                  ) : (
                    format(dateRange.from, "dd.MM.yyyy", { locale: ru })
                  )
                ) : (
                  "Выбрать период"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={dateRange.from ? dateRange as { from: Date; to?: Date } : undefined}
                onSelect={(range) => setDateRange(range || {})}
                locale={ru}
                numberOfMonths={2}
              />
              {(dateRange.from || dateRange.to) && (
                <div className="p-3 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setDateRange({})} className="w-full">
                    Сбросить фильтр
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Left Arrow */}
          {filteredNews.length > 3 && (
            <Button
              onClick={scrollLeft}
              size="icon"
              variant="outline"
              className="absolute -left-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-background/95 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:bg-primary hover:text-primary-foreground shadow-lg"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto gap-4 md:gap-8 pb-4 snap-x snap-mandatory"
            style={{
              scrollBehavior: "smooth",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              scrollPaddingInline: "1rem",
            }}
          >
            {infiniteNews.map((item, index) => (
              <article
                key={`${item.id}-${index}`}
                className="group rounded-3xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2 flex-none w-[calc(100vw-2rem)] md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] snap-start first:ml-4 last:mr-4 md:first:ml-0 md:last:mr-0"
              >
                {/* Image */}
                <Link href={`/news/${item.id}`} className="block relative h-56 bg-secondary/20 overflow-hidden">
                  <Image
                    src={item.image_url || ""}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </Link>

                {/* Content */}
                <div className="p-6">
                  {/* Date */}
                  {item.published_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="h-4 w-4" />
                      {new Date(item.published_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  )}

                  {/* Title */}
                  <Link href={`/news/${item.id}`}>
                    <h3 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </Link>

                  {/* Content */}
                  <p className="text-muted-foreground leading-relaxed line-clamp-3 mb-4">{item.content}</p>

                  {/* Read More */}
                  <Link
                    href={`/news/${item.id}`}
                    className="inline-flex items-center gap-2 text-primary font-medium group/btn hover:underline"
                  >
                    Подробнее
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Right Arrow */}
          {filteredNews.length > 3 && (
            <Button
              onClick={scrollRight}
              size="icon"
              variant="outline"
              className="absolute -right-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-background/95 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:bg-primary hover:text-primary-foreground shadow-lg"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        {filteredNews.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска.
          </div>
        )}
      </div>
    </section>
  )
}
