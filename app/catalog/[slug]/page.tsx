
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/calming/header"
import { CatalogWithFilters } from "@/components/calming/catalog-with-filters"
import { Footer } from "@/components/calming/footer"
import type { LandPlot, MapSettings } from "@/lib/types"
import { SEO_PAGES, SeoCatalogPageConfig } from "@/config/seo-pages"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { buildPlotSlug } from "@/lib/utils"

// Helper to resolve dynamic pages based on DB locations
async function resolveDynamicPage(slug: string): Promise<SeoCatalogPageConfig | null> {
  // 1. Check static config first
  if (SEO_PAGES[slug]) {
    return SEO_PAGES[slug]
  }

  // 2. Try to match against DB locations
  const supabase = await createClient()

  // Fetch unique locations and districts
  // We need to fetch all active plots to extract unique locations/districts
  // In a larger app, we'd have a separate 'locations' table or use distinct() query
  const { data: plots } = await supabase
    .from("land_plots")
    .select("location, district")
    .eq("is_active", true)

  if (!plots) return null

  // Create set of unique locations/districts to check
  // We check both 'location' field and 'district' field
  const candidates = new Map<string, { type: 'location' | 'district', value: string }>()

  plots.forEach(p => {
    if (p.location) {
      const s = buildPlotSlug({ location: p.location })
      // Special case: buildPlotSlug adds 'uchastok ' prefix usually.
      // But let's check exactly what buildPlotSlug does.
      // It does: `uchastok ${locationLabel} ...` -> slugify.
      // So "pos. Shosseynoe" -> "uchastok-pos-shosseynoe"
      candidates.set(s, { type: 'location', value: p.location })
    }
    if (p.district) {
      const s = buildPlotSlug({ district: p.district })
      candidates.set(s, { type: 'district', value: p.district })
    }
  })

  const match = candidates.get(slug)
  if (match) {
    const isDistrict = match.type === 'district'
    return {
      title: `Земельные участки ${isDistrict ? 'в' : 'в'} ${match.value}`,
      description: `Продажа земельных участков ${isDistrict ? 'в' : 'в'} ${match.value}. Актуальные предложения, цены и планировки.`,
      h1: `Участки ${isDistrict ? 'в' : 'в'} ${match.value}`,
      filter: isDistrict ? { district: match.value } : { settlement: match.value }
    }
  }

  return null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await resolveDynamicPage(slug)

  if (!page) return {}

  const baseUrl = "https://baltland.ru"
  const canonical = `${baseUrl}/catalog/${slug}`
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical },
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonical,
      type: "website",
    },
  }
}

export default async function SeoCatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await resolveDynamicPage(slug)

  if (!page) return notFound()

  const supabase = await createClient()

  const { data: plots } = await supabase
    .from("land_plots")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })

  const { data: org } = await supabase
    .from("organization_settings")
    .select("map_settings")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle()

  const mapSettings = ((org as any)?.map_settings ?? null) as MapSettings | null

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumbs - Sticky below header */}
      <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <SiteBreadcrumb
            items={[
              { label: "Каталог", href: "/catalog" },
              { label: page.h1 || page.title, href: `/catalog/${slug}` }
            ]}
          />
        </div>
      </div>

      <div className="pt-8">
        <div className="container mx-auto px-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{page.h1 || page.title}</h1>
          <p className="text-muted-foreground mt-2">{page.description}</p>
        </div>
        <CatalogWithFilters
          initialPlots={(plots as LandPlot[]) || []}
          initialFilters={page.filter}
          mapSettings={mapSettings}
        />
      </div>
      <Footer />
    </main>
  )
}
