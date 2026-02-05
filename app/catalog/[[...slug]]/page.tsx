
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/calming/header"
import { CatalogWithFilters } from "@/components/calming/catalog-with-filters"
import { Footer } from "@/components/calming/footer"
import type { LandPlot, MapSettings } from "@/lib/types"
import { SEO_PAGES, SeoCatalogPageConfig } from "@/config/seo-pages"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { buildLocationSlug, buildPlotSeoPath, buildPlotSlug } from "@/lib/utils"
import { Metadata } from "next"
import { ItemListJsonLd } from "@/components/seo/item-list-jsonld"

interface CatalogPageProps {
    params: Promise<{ slug?: string[] }>
    searchParams: Promise<{
        maxPrice?: string
        landStatus?: string
        installment?: string
        utilities?: string
        isNew?: string
        page?: string
        search?: string
    }>
}

async function resolveHierarchy(slugs: string[]): Promise<SeoCatalogPageConfig | null> {
    const supabase = await createClient()

    // 1. Root catalog
    if (slugs.length === 0) {
        return {
            title: "Каталог земельных участков | БалтикЗемля",
            description: "Каталог земельных участков в Калининградской области. Подбор по назначению, цене и коммуникациям.",
            h1: "Каталог участков",
            filter: {}
        }
    }

    // 2. Single slug: could be a Tag (SEO_PAGES) or a District
    if (slugs.length === 1) {
        const slug = slugs[0]

        // Check SEO_PAGES first (tags like 'izhs', 'sea', etc)
        if (SEO_PAGES[slug]) {
            return SEO_PAGES[slug]
        }

        // Check if it's a district
        const { data: plots } = await supabase
            .from("land_plots")
            .select("district")
            .eq("is_active", true)

        if (plots) {
            const districts = Array.from(new Set(plots.map(p => p.district).filter(Boolean)))
            const match = districts.find(d => buildLocationSlug(d!) === slug)
            if (match) {
                return {
                    title: `Участки в ${match} | БалтикЗемля`,
                    description: `Продажа земельных участков в ${match}. Актуальные предложения и цены.`,
                    h1: `Участки в ${match}`,
                    filter: { district: match }
                }
            }
        }
    }

    // 3. Two slugs: [district]/[settlement]
    if (slugs.length === 2) {
        const [districtSlug, settlementSlug] = slugs

        const { data: plots } = await supabase
            .from("land_plots")
            .select("location, district")
            .eq("is_active", true)

        if (plots) {
            const match = plots.find(p =>
                p.location && p.district &&
                buildLocationSlug(p.district) === districtSlug &&
                buildLocationSlug(p.location) === settlementSlug
            )

            if (match) {
                return {
                    title: `Участки в ${match.location}, ${match.district} | БалтикЗемля`,
                    description: `Продажа земельных участков в ${match.location} (${match.district}). Актуальные предложения, цены и характеристики.`,
                    h1: `Участки в ${match.location}`,
                    filter: { district: match.district!, settlement: match.location! }
                }
            }
        }
    }

    return null
}

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
    const p = await params
    const config = await resolveHierarchy(p.slug || [])

    if (!config) return {}

    const baseUrl = "https://baltland.ru"
    const slugPath = p.slug?.join("/") || ""
    const canonical = `${baseUrl}/catalog${slugPath ? `/${slugPath}` : ""}`

    return {
        title: config.title,
        description: config.description,
        alternates: { canonical },
        openGraph: {
            title: config.title,
            description: config.description,
            url: canonical,
            type: "website",
        },
    }
}

export default async function CatalogPage({ params, searchParams }: CatalogPageProps) {
    const p = await params
    const sParams = await searchParams
    const config = await resolveHierarchy(p.slug || [])

    if (!config) return notFound()

    const supabase = await createClient()

    // Fetch all relevant plots
    const { data: activePlots } = await supabase
        .from("land_plots")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })

    const { data: hiddenBundlePlots } = await supabase
        .from("land_plots")
        .select("*")
        .eq("is_active", false)
        .not("bundle_id", "is", null)

    const plots = [...(activePlots || []), ...(hiddenBundlePlots || [])]

    // Parse initial filters from URL and config
    const initialFilters = {
        ...config.filter,
        maxPrice: sParams.maxPrice ? parseInt(sParams.maxPrice, 10) : config.filter?.maxPrice,
        landStatus: sParams.landStatus || config.filter?.landStatus,
        installment: sParams.installment || config.filter?.installment,
        utilities: sParams.utilities || config.filter?.utilities,
        isNew: sParams.isNew || undefined,
        page: sParams.page ? parseInt(sParams.page, 10) : undefined,
    }

    const { data: org } = await supabase
        .from("organization_settings")
        .select("map_settings")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .maybeSingle()

    const mapSettings = ((org as any)?.map_settings ?? null) as MapSettings | null

    // Breadcrumbs logic
    const breadcrumbItems = [{ label: "Каталог", href: "/catalog" }]
    if (p.slug && p.slug.length >= 1) {
        // If it's a district or tag
        if (config.filter?.district) {
            breadcrumbItems.push({
                label: config.filter.district,
                href: `/catalog/${buildLocationSlug(config.filter.district)}`
            })
        } else if (p.slug.length === 1 && SEO_PAGES[p.slug[0]]) {
            breadcrumbItems.push({
                label: SEO_PAGES[p.slug[0]].h1 || SEO_PAGES[p.slug[0]].title,
                href: `/catalog/${p.slug[0]}`
            })
        }

        // If it's a settlement
        if (config.filter?.settlement && config.filter?.district) {
            breadcrumbItems.push({
                label: config.filter.settlement,
                href: `/catalog/${buildLocationSlug(config.filter.district)}/${buildLocationSlug(config.filter.settlement)}`
            })
        }
    }

    return (
        <main className="min-h-screen bg-background">
            <Header />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="container mx-auto px-4 py-3">
                    <SiteBreadcrumb items={breadcrumbItems} />
                    <ItemListJsonLd
                        items={plots.slice(0, 12).map((plot, index) => ({
                            name: plot.title || `Участок ${plot.area_sotok} сот.`,
                            url: `https://baltland.ru${buildPlotSeoPath({
                                district: plot.district,
                                location: plot.location,
                                intId: plot.int_id || plot.id,
                            })}`,
                            position: index + 1,
                            image: plot.image_url || undefined
                        }))}
                    />
                </div>
            </div>

            <div className="pt-8">
                {(config.h1 || config.description) && (
                    <div className="container mx-auto px-4 mb-6">
                        {config.h1 && <h1 className="text-3xl font-bold tracking-tight">{config.h1}</h1>}
                        {config.description && <p className="text-muted-foreground mt-2">{config.description}</p>}
                    </div>
                )}
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
