"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Ruler, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import type { LandPlot } from "@/lib/types"
import { buildPlotSlug } from "@/lib/utils"

interface SimilarPlotsSliderProps {
    plots: LandPlot[]
}

export function SimilarPlotsSlider({ plots }: SimilarPlotsSliderProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
            setCanScrollLeft(scrollLeft > 5)
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5)
        }
    }

    useEffect(() => {
        checkScroll()
        window.addEventListener("resize", checkScroll)
        return () => window.removeEventListener("resize", checkScroll)
    }, [plots])

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current
            const card = container.querySelector('[data-slider-item]') as HTMLElement
            if (card) {
                const scrollAmount = card.offsetWidth + 24 // card width + gap
                container.scrollBy({
                    left: direction === "left" ? -scrollAmount : scrollAmount,
                    behavior: "smooth"
                })
            }
        }
    }

    return (
        <div className="relative group/slider">
            {/* Left Arrow */}
            {canScrollLeft && (
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute -left-5 top-1/2 -translate-y-1/2 z-30 h-11 w-11 rounded-full bg-white shadow-xl border-emerald-100 text-emerald-700 hover:bg-emerald-50 transition-all hidden md:flex"
                    onClick={() => scroll("left")}
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
            )}

            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                onScroll={checkScroll}
                className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide no-scrollbar"
                style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {plots.map((sp) => {
                    const spArea = Number(sp.area_sotok) || 0
                    const spSlug = buildPlotSlug({
                        district: sp.district || undefined,
                        location: sp.location || undefined,
                        areaSotok: spArea,
                        id: sp.int_id || sp.id
                    })
                    const spPrice = Number(sp.price) || 0

                    return (
                        <div
                            key={sp.id}
                            data-slider-item
                            className="flex-none w-[280px] md:w-[calc(33.333%-16px)] snap-start"
                        >
                            <Link href={`/uchastok/${spSlug}`}>
                                <div className="h-full bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 group/card flex flex-col">
                                    <div className="aspect-[4/3] bg-muted relative w-full overflow-hidden">
                                        {sp.image_url ? (
                                            <Image
                                                src={sp.image_url}
                                                alt={sp.title || `Земельный участок ${spArea} сот. в ${sp.location || sp.district || "Калининградской области"}`}
                                                fill
                                                className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                                                sizes="(max-width: 768px) 280px, 33vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <MapPin className="h-8 w-8 text-muted-foreground/30" />
                                            </div>
                                        )}
                                        {sp.land_status && (
                                            <Badge className="absolute top-3 left-3 bg-white/90 text-slate-700 hover:bg-white border-none shadow-sm font-medium">
                                                {sp.land_status}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="font-bold text-xl mb-1 text-slate-900">
                                            {spPrice > 0
                                                ? new Intl.NumberFormat("ru-RU").format(spPrice) + " ₽"
                                                : "Цена по запросу"}
                                        </div>
                                        <div className="text-sm text-slate-500 mb-4 line-clamp-1 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                            {sp.location || sp.district || "Калининградская обл."}
                                        </div>
                                        <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 w-fit px-3 py-1.5 rounded-xl">
                                            <Ruler className="h-4 w-4" />
                                            <span>{spArea} соток</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    )
                })}
            </div>

            {/* Right Arrow */}
            {canScrollRight && (
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute -right-5 top-1/2 -translate-y-1/2 z-30 h-11 w-11 rounded-full bg-white shadow-xl border-emerald-100 text-emerald-700 hover:bg-emerald-50 transition-all hidden md:flex"
                    onClick={() => scroll("right")}
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            )}

            {/* Mobile Gradient indicators for scroll */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none opacity-0 md:hidden transition-opacity" style={{ opacity: canScrollLeft ? 1 : 0 }} />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-0 md:hidden transition-opacity" style={{ opacity: canScrollRight ? 1 : 0 }} />
        </div>
    )
}
