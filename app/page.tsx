import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

import { Header } from "@/components/calming/header"
import { HeroSection } from "@/components/calming/hero-section"
import { CatalogWithFilters } from "@/components/calming/catalog-with-filters"
import { NewsSection } from "@/components/calming/news-section"
import { HomeNewBlock } from "@/components/calming/home-new-block"
import { ContactSection } from "@/components/calming/contact-section"
import { Footer } from "@/components/calming/footer"
import type { LandPlot, MapSettings, News } from "@/lib/types"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = "https://baltland.ru"
  const title = "Купить участок ИЖС в Калининграде — от 100 тыс. ₽ | BaltLand"
  const description = "Продажа земельных участков под ИЖС в Калининградской области. Более 12 лет помогаем людям обрести свой уголок у Балтийского моря. Честная цена, полное сопровождение."
  const keywords = "купить участок, ИЖС, Калининград, Зеленоградск, Светлогорск, земельные участки, Балтийское море, недвижимость"

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: "БалтикЗемля",
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "БалтикЗемля - Продажа участков в Калининградской области",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/og-image.png`],
    },
  }
}

export default async function Home() {
  const supabase = await createClient()

  // Fetch all active plots from database
  const { data: plots } = await supabase
    .from("land_plots")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })

  let minPrice = 0
  let maxPrice = 0
  if (plots && plots.length > 0) {
    // Filter out plots with price 0 or invalid prices
    const validPrices = plots.filter((p) => p.price && p.price > 0).map((p) => p.price)
    if (validPrices.length > 0) {
      minPrice = Math.min(...validPrices)
      maxPrice = Math.max(...validPrices)
    }
  }

  const { data: newsData, error: newsError } = await supabase
    .from("news")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })

  let news: News[] = []
  // Only use news if table exists and query succeeded
  if (!newsError && newsData) {
    news = newsData as News[]
  }

  const { data: homeBlockSettings } = await supabase
    .from("organization_settings")
    .select("home_block_progressive_disclosure, home_block_roi_calculator, home_block_faq, map_settings")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle()

  const mapSettings = ((homeBlockSettings as any)?.map_settings ?? null) as MapSettings | null

  const lotCount = (() => {
    const seen = new Set<string>()
    let n = 0
    const activePlotsWithPrice = ((plots as any[]) || []).filter((p) => p.price && p.price > 0)
    activePlotsWithPrice.forEach((p) => {
      const bid = p?.bundle_id
      const key = bid ? `bundle:${bid}` : `plot:${p?.id}`
      if (seen.has(key)) return
      seen.add(key)
      n += 1
    })
    return n
  })()

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection plotCount={lotCount} minPrice={minPrice} maxPrice={maxPrice} />
      <CatalogWithFilters initialPlots={(plots as LandPlot[]) || []} mapSettings={mapSettings} />
      <HomeNewBlock
        config={{
          progressive_disclosure: (homeBlockSettings as any)?.home_block_progressive_disclosure ?? null,
          roi_calculator: (homeBlockSettings as any)?.home_block_roi_calculator ?? null,
          faq: (homeBlockSettings as any)?.home_block_faq ?? null,
        }}
      />
      {news.length > 0 && <NewsSection news={news} />}
      <ContactSection />
      <Footer />
    </main>
  )
}
