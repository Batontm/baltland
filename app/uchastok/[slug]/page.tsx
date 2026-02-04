
import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { getLandPlotBundleById, getOrganizationSettings, getSimilarPlots } from "@/app/actions"
import type { LandPlot } from "@/lib/types"
import { buildPlotSlug, parseIdFromSlug } from "@/lib/utils"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { SimilarPlotsSlider } from "@/components/plots/similar-plots-slider"
import { PlotHeroMapWrapper } from "@/components/plots/plot-hero-map-wrapper"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Ruler, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { CallbackButtons } from "@/components/plots/callback-buttons"
import { PlotJsonLd } from "@/components/seo/plot-jsonld"

// Re-use logic from old page.tsx but adapted for the new [slug] format
// We import it as dynamic to ensure metadata is generated correctly

function toPlainText(input: string) {
    return input
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

function truncate(input: string, maxLen: number) {
    if (input.length <= maxLen) return input
    return `${input.slice(0, maxLen - 1).trimEnd()}…`
}

function renderRichText(input: string) {
    const withBold = input
        .replace(/<\s*b\s*>/gi, "**")
        .replace(/<\s*\/\s*b\s*>/gi, "**")

    const escaped = withBold
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r\n/g, "\n")

    const html = escaped
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br />")

    return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params
    const id = parseIdFromSlug(slug)
    if (!id) return { title: "Участок не найден" }

    const bundleResult = await getLandPlotBundleById(id)
    const plot = bundleResult?.plot
    if (!plot) return { title: "Участок не найден" }

    const bundlePlots = bundleResult?.bundlePlots ?? []
    const totalArea = plot.bundle_id
        ? bundlePlots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
        : Number(plot.area_sotok) || 0

    const canonicalSlug = buildPlotSlug({
        location: plot.location,
        district: plot.district,
        areaSotok: totalArea,
        id: plot.int_id || plot.id
    })

    const cadastral = plot.cadastral_number ? `КН ${plot.cadastral_number}` : ""
    const title = `Участок ${totalArea} сот. в ${plot.location || plot.district}${cadastral ? ` | ${cadastral}` : ""}`
    const description = truncate(toPlainText(plot.description || ""), 160) || `Земельный участок ${totalArea} соток в ${plot.location || plot.district}.`

    return {
        title: `${title} | БалтикЗемля`,
        description,
        alternates: { canonical: `https://baltland.ru/uchastok/${canonicalSlug}` },
        openGraph: {
            title,
            description,
            url: `https://baltland.ru/uchastok/${canonicalSlug}`,
            type: "website",
            images: plot.image_url ? [{ url: plot.image_url }] : undefined,
        },
    }
}

export default async function PlotSitemapPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const id = parseIdFromSlug(slug)

    if (!id) notFound()

    const [bundleResult, settings] = await Promise.all([
        getLandPlotBundleById(id),
        getOrganizationSettings()
    ])

    const plot = bundleResult?.plot
    if (!plot) notFound()

    const bundlePlots = bundleResult?.bundlePlots ?? []
    const totalArea = plot.bundle_id
        ? bundlePlots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
        : Number(plot.area_sotok) || 0

    const expectedSlug = buildPlotSlug({
        location: plot.location,
        district: plot.district,
        areaSotok: totalArea,
        id: plot.int_id || plot.id
    })

    if (slug !== expectedSlug) {
        permanentRedirect(`/uchastok/${expectedSlug}`)
    }

    const primaryPlot = plot.bundle_id
        ? bundlePlots.find((p) => p.is_bundle_primary) ?? plot
        : plot

    const price = Number(primaryPlot?.price ?? plot.price)
    const cadastral = plot.cadastral_number ? `КН ${plot.cadastral_number}` : ""
    const plotLabel = `Участок ${totalArea} сот. ${cadastral || (plot.location || plot.district || "Калининградская область")}`

    const similarPlots = await getSimilarPlots(plot.id, plot.district, 12)

    // Build breadcrumbs dynamically
    const breadcrumbItems = [
        { label: "Каталог", href: "/catalog" }
    ]

    if (plot.district) {
        const districtSlug = buildPlotSlug({ district: plot.district })
        breadcrumbItems.push({
            label: plot.district,
            href: `/catalog/${districtSlug}`
        })

        if (plot.location) {
            const settlementSlug = buildPlotSlug({ location: plot.location })
            breadcrumbItems.push({
                label: plot.location,
                href: `/catalog/${districtSlug}/${settlementSlug}`
            })
        }
    } else if (plot.location) {
        // Fallback if district is missing but location is present
        breadcrumbItems.push({
            label: plot.location,
            href: `/catalog/${buildPlotSlug({ location: plot.location })}`
        })
    }

    breadcrumbItems.push({ label: plotLabel, href: `/uchastok/${expectedSlug}` })

    const plotUrl = `https://baltland.ru/uchastok/${expectedSlug}`

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <PlotJsonLd
                plot={plot as LandPlot}
                totalArea={totalArea}
                price={price}
                url={plotUrl}
            />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <SiteBreadcrumb
                    items={breadcrumbItems}
                    className="container mx-auto px-4 py-3"
                />
            </div>

            <section className="relative px-4 md:px-8 pt-8">
                <div className="max-w-6xl mx-auto">
                    <PlotHeroMapWrapper
                        plot={plot as LandPlot}
                        bundlePlots={bundlePlots as LandPlot[]}
                        totalArea={totalArea}
                        price={price}
                        phone={settings?.phone || undefined}
                    />
                </div>
            </section>

            <section className="relative -mt-16 z-10 container mx-auto px-4">
                <div className="max-w-4xl mx-auto bg-white shadow-lg p-6 rounded-3xl">
                    <h1 className="text-2xl md:text-3xl font-semibold mb-2">
                        {plotLabel}
                    </h1>
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{plot.location}, {plot.district}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-lg font-bold">
                            {new Intl.NumberFormat('ru-RU').format(price)} ₽
                        </span>
                        <span className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-full">
                            <Ruler className="h-4 w-4" />
                            {totalArea} соток
                        </span>
                    </div>

                    <CallbackButtons
                        phone={settings?.phone}
                        plotTitle={plot.title || `Участок ${totalArea} сот.`}
                        cadastralNumber={plot.cadastral_number}
                        plotId={plot.id}
                        location={plot.location}
                        price={price}
                        areaSotok={totalArea}
                    />
                </div>
            </section>

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    {plot.description && (
                        <div>
                            <h2 className="text-xl font-bold mb-4">Описание</h2>
                            <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                {renderRichText(plot.description)}
                            </div>
                        </div>
                    )}
                </div>

                {similarPlots.length > 0 && (
                    <div className="max-w-6xl mx-auto mt-12">
                        <h2 className="text-2xl font-bold mb-8">Похожие участки</h2>
                        <SimilarPlotsSlider plots={similarPlots} />
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}
