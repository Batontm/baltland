import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

import { Header } from "@/components/calming/header"
import { CatalogWithFilters } from "@/components/calming/catalog-with-filters"
import { Footer } from "@/components/calming/footer"
import type { Metadata } from "next"
import type { LandPlot, MapSettings } from "@/lib/types"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"

interface CatalogPageProps {
    searchParams: Promise<{
        maxPrice?: string
        landStatus?: string
        installment?: string
        utilities?: string
        isNew?: string
    }>
}

export async function generateMetadata(): Promise<Metadata> {
    const baseUrl = "https://baltland.ru"
    const canonical = `${baseUrl}/catalog`
    const title = "Каталог земельных участков | БалтикЗемля"
    const description = "Каталог земельных участков в Калининградской области. Подбор по назначению, цене и коммуникациям."

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title,
            description,
            url: canonical,
            type: "website",
        },
    }
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
    const params = await searchParams
    const supabase = await createClient()

    // Fetch all active plots from database
    // Include hidden bundle plots so their polygons can be shown on the map
    const { data: activePlots } = await supabase
        .from("land_plots")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })

    // Also fetch hidden bundle plots for map polygon display
    const { data: hiddenBundlePlots } = await supabase
        .from("land_plots")
        .select("*")
        .eq("is_active", false)
        .not("bundle_id", "is", null)

    // Combine: active plots + hidden bundle plots
    const plots = [...(activePlots || []), ...(hiddenBundlePlots || [])]

    // Parse initial filters from URL
    const initialFilters = {
        maxPrice: params.maxPrice ? parseInt(params.maxPrice, 10) : undefined,
        landStatus: params.landStatus || undefined,
        installment: params.installment || undefined,
        utilities: params.utilities || undefined,
        isNew: params.isNew || undefined,
    }

    const { data: org } = await supabase
        .from("organization_settings")
        .select("map_settings")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle()

    const mapSettings = ((org as any)?.map_settings ?? null) as MapSettings | null

    return (
        <main className="min-h-screen bg-background">
            <Header />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="container mx-auto px-4 py-3">
                    <SiteBreadcrumb
                        items={[{ label: "Каталог", href: "/catalog" }]}
                    />
                </div>
            </div>

            <div className="pt-8">
                <CatalogWithFilters
                    initialPlots={(plots as LandPlot[]) || []}
                    initialFilters={initialFilters}
                    mapSettings={mapSettings}
                />
            </div>
            <Footer />
        </main>
    )
}
