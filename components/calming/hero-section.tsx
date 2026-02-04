"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface HeroSectionProps {
  plotCount?: number
  minPrice?: number
  maxPrice?: number
}

export function HeroSection({ plotCount = 0, minPrice = 0, maxPrice = 0 }: HeroSectionProps) {
  const displayCount = plotCount

  // Typewriter effect state
  const fullText = "Создайте свой актив в Калининградской области. Земля для жизни, строительства и надежных инвестиций. Честная цена без скрытых комиссий."
  const [displayedText, setDisplayedText] = useState("")
  const [isTypingComplete, setIsTypingComplete] = useState(false)


  useEffect(() => {
    let currentIndex = 0
    const typingSpeed = 30 // ms per character

    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        setIsTypingComplete(true)
        clearInterval(typingInterval)
      }
    }, typingSpeed)

    return () => clearInterval(typingInterval)
  }, [])


  const formatPrice = (price: number) => {
    if (price === 0) return "—"
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)} м`
    }
    return `${(price / 1000).toFixed(0)} т`
  }

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 via-background to-accent/10" />

      <div className="container mx-auto px-4 relative z-10 py-12 lg:py-20">
        <div className="relative flex flex-col lg:flex-row items-center">
          {/* Left side - Animated landscape illustration */}
          <div className="relative w-full lg:w-3/5 h-[400px] sm:h-[500px] lg:h-[650px] z-0">
            {/* Image container with rounded corners */}
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
              {/* Main landscape image - Optimized for SEO and performance */}
              <Image
                src="/kaliningrad-map-hero.webp"
                alt="Продажа земельных участков ИЖС в Калининградской области — БалтикЗемля"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />

              {/* Animated gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/20" />

              {/* Animated sun rays */}
              <div className="absolute top-0 right-0 w-64 h-64 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-80 h-80 animate-spin-slow opacity-30">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-1 h-40 bg-gradient-to-b from-yellow-200/60 to-transparent origin-bottom"
                      style={{ transform: `rotate(${i * 30}deg)` }}
                    />
                  ))}
                </div>
              </div>

              {/* Floating particles - fireflies/pollen */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => {
                  const left = 10 + ((i * 37) % 80)
                  const top = 20 + ((i * 53) % 60)
                  const duration = 3 + ((i * 17) % 30) / 10

                  return (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-yellow-200/70 animate-firefly"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: `${duration}s`,
                      }}
                    />
                  )
                })}
              </div>

              {/* Animated birds */}
              <div className="absolute top-[15%] left-[10%] animate-bird opacity-70">
                <svg width="30" height="15" viewBox="0 0 30 15" className="text-foreground/60">
                  <path d="M0,7 Q7,0 15,7 Q22,0 30,7" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="absolute top-[25%] left-[5%] animate-bird-delayed opacity-50">
                <svg width="20" height="10" viewBox="0 0 20 10" className="text-foreground/50">
                  <path d="M0,5 Q5,0 10,5 Q15,0 20,5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Animated clouds */}
              <div className="absolute top-[10%] left-0 animate-cloud opacity-80">
                <svg width="100" height="40" viewBox="0 0 100 40" className="text-white">
                  <ellipse cx="30" cy="25" rx="30" ry="15" fill="currentColor" />
                  <ellipse cx="55" cy="20" rx="25" ry="12" fill="currentColor" />
                  <ellipse cx="75" cy="25" rx="20" ry="10" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute top-[20%] left-[20%] animate-cloud-slow opacity-60">
                <svg width="70" height="30" viewBox="0 0 70 30" className="text-white">
                  <ellipse cx="20" cy="18" rx="20" ry="10" fill="currentColor" />
                  <ellipse cx="45" cy="15" rx="18" ry="9" fill="currentColor" />
                </svg>
              </div>

              {/* Swaying trees silhouette at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-40 flex items-end justify-around px-4">
                {[40, 60, 35, 55, 45, 65, 50].map((height, i) => (
                  <div key={i} className="animate-sway origin-bottom" style={{ animationDelay: `${i * 0.3}s` }}>
                    <svg width="30" height={height} viewBox={`0 0 30 ${height}`} className="text-primary/80">
                      <polygon
                        points={`15,0 ${25},${height * 0.4} ${20},${height * 0.38} ${28},${height * 0.7} ${18},${height * 0.68} 30,${height} 0,${height} ${12},${height * 0.68} ${2},${height * 0.7} ${10},${height * 0.38} ${5},${height * 0.4}`}
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                ))}
              </div>

              {/* Animated grass/wheat at very bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden">
                <div className="flex items-end h-full">
                  {[...Array(40)].map((_, i) => {
                    const height = 12 + ((i * 7) % 20)
                    return (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-primary/60 to-primary/20 rounded-t animate-grass origin-bottom"
                        style={{
                          height: `${height}px`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Right side - Text content with Glassmorphism block overlap */}
          <div className="w-full lg:w-1/2 mt-8 lg:mt-0 lg:-ml-[12%] relative z-20">
            {/* Header Glass Block */}
            <div className="bg-white/40 backdrop-blur-3xl p-8 sm:p-10 lg:p-14 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 border-l-white/40 mb-10">
              {/* Main Heading - H1 optimized for SEO */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium leading-tight mb-8 animate-slide-up">
                <span className="block whitespace-nowrap">Земельные участки</span>
                <span className="block text-primary mt-2">в Калининграде</span>
              </h1>

              {/* Subtitle with typewriter effect */}
              <p
                className="text-lg sm:text-xl text-muted-foreground leading-relaxed min-h-[4rem]"
              >
                {displayedText}
                <span
                  className={`inline-block w-0.5 h-6 bg-primary ml-1 align-middle ${isTypingComplete ? 'animate-blink' : 'animate-pulse'
                    }`}
                />
              </p>
            </div>

            {/* Stats Blocks - Smaller and neatly aligned */}
            <div
              className="grid grid-cols-3 gap-4 sm:gap-6 animate-slide-up w-full"
              style={{ animationDelay: "0.3s" }}
            >
              {[
                { value: String(displayCount), label: "УЧАСТКОВ" },
                {
                  value: minPrice > 0 ? `от ${formatPrice(minPrice)}` : "—",
                  label: "₽ ЦЕНА"
                },
                {
                  value: maxPrice > 0 ? `до ${formatPrice(maxPrice)}` : "—",
                  label: "₽ ЦЕНА"
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="text-center p-4 sm:p-6 rounded-2xl bg-white/70 backdrop-blur-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-white/40 hover:shadow-md hover:scale-[1.02] transition-all"

                >
                  <div className="text-xl sm:text-2xl font-serif font-semibold text-primary">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 tracking-[0.15em] font-medium opacity-70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
