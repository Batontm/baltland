import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { getLandPlotBundleById, getOrganizationSettings, getSimilarPlots } from "@/app/actions"
import type { LandPlot } from "@/lib/types"
import {
    buildPlotSeoPath,
    formatArea,
    parseIntIdFromPlotSeoSlug,
    buildDistrictSeoSegment,
    buildSettlementSeoSegment,
    buildLocationSlug,
} from "@/lib/utils"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"
import { SimilarPlotsSlider } from "@/components/plots/similar-plots-slider"
import { PlotHeroMapWrapper } from "@/components/plots/plot-hero-map-wrapper"
import { MapPin, Ruler } from "lucide-react"
import { CallbackButtons } from "@/components/plots/callback-buttons"
import { DirectionsButton } from "@/components/plots/directions-button"
import { PlotJsonLd } from "@/components/seo/plot-jsonld"

function truncate(input: string, maxLen: number) {
    if (input.length <= maxLen) return input
    return `${input.slice(0, maxLen - 1).trimEnd()}…`
}

function formatPriceRub(value: number) {
    if (!Number.isFinite(value) || value <= 0) return ""
    return new Intl.NumberFormat("ru-RU").format(value) + " руб."
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

    // Check if there's a disclaimer block
    const disclaimerMarker = "❗ Важно о деталях:"
    const disclaimerIndex = escaped.indexOf(disclaimerMarker)

    if (disclaimerIndex !== -1) {
        const mainContent = escaped.substring(0, disclaimerIndex).trim()
        const disclaimerContent = escaped.substring(disclaimerIndex)

        const mainHtml = mainContent
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br />")

        const disclaimerHtml = disclaimerContent
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br />")

        return (
            <>
                <span dangerouslySetInnerHTML={{ __html: mainHtml }} />
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                    <span dangerouslySetInnerHTML={{ __html: disclaimerHtml }} />
                </div>
            </>
        )
    }

    const html = escaped
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br />")

    return <span dangerouslySetInnerHTML={{ __html: html }} />
}

function buildPlotMetaDescription(plot: LandPlot, totalArea: number, priceRaw: number) {
    const areaStr = formatArea(totalArea)
    const locationLabel =
        String(plot.location || "").trim() ||
        String(plot.district || "").trim() ||
        "Калининградской области"
    const status = String(plot.land_status || "").trim()
    const cadastral = String(plot.cadastral_number || "").trim()
    const price = formatPriceRub(priceRaw)

    const utilities: string[] = []
    if (plot.has_electricity) utilities.push("свет по границе")
    if (plot.has_gas) utilities.push("газ")
    if (plot.has_water) utilities.push("вода")

    const utilitiesText = utilities.length ? utilities.join(", ") : "коммуникации уточняйте"

    const parts = [
        `Купить участок ${areaStr}`,
        locationLabel ? `в ${locationLabel}` : "",
        status ? `(${status})` : "",
        utilitiesText ? `${utilitiesText}.` : "",
        cadastral ? `Кадастровый номер ${cadastral}.` : "",
        price ? `Цена ${price}.` : "",
    ].filter(Boolean)

    return truncate(parts.join(" ").replace(/\s+/g, " ").trim(), 160)
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ district: string; settlement: string; slug: string }>
}): Promise<Metadata> {
    const { district, settlement, slug } = await params
    const intId = parseIntIdFromPlotSeoSlug(slug)
    if (!intId) return { title: "Участок не найден" }

    const bundleResult = await getLandPlotBundleById(intId)
    const plot = bundleResult?.plot
    if (!plot) return { title: "Участок не найден" }

    const bundlePlots = bundleResult?.bundlePlots ?? []
    const totalArea = plot.bundle_id
        ? bundlePlots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
        : Number(plot.area_sotok) || 0

    const expectedDistrict = buildDistrictSeoSegment(plot.district)
    const expectedSettlement = buildSettlementSeoSegment(plot.location)
    const expectedSlug = `prodazha-uchastka-${plot.int_id || intId}`

    if (district !== expectedDistrict || settlement !== expectedSettlement || slug !== expectedSlug) {
        permanentRedirect(`${buildPlotSeoPath({ district: plot.district, location: plot.location, intId: plot.int_id || intId })}`)
    }

    const cadastral = plot.cadastral_number ? `КН ${plot.cadastral_number}` : ""
    const areaStr = formatArea(totalArea)
    // Ensure unique title: use cadastral number if available, otherwise use int_id
    const uniqueSuffix = cadastral || `#${plot.int_id || intId}`
    const title = `Участок ${areaStr} в ${plot.location || plot.district} | ${uniqueSuffix}`

    const priceRaw = Number(plot.price)
    const description = buildPlotMetaDescription(plot, totalArea, priceRaw)

    const canonical = `https://baltland.ru${buildPlotSeoPath({ district: plot.district, location: plot.location, intId: plot.int_id || intId })}`

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title,
            description,
            url: canonical,
            type: "website",
            images: plot.image_url ? [{ url: plot.image_url }] : undefined,
        },
    }
}

export default async function PlotSeoPage({
    params,
}: {
    params: Promise<{ district: string; settlement: string; slug: string }>
}) {
    const { district, settlement, slug } = await params
    const intId = parseIntIdFromPlotSeoSlug(slug)
    if (!intId) notFound()

    const [bundleResult, settings] = await Promise.all([getLandPlotBundleById(intId), getOrganizationSettings()])
    const plot = bundleResult?.plot
    if (!plot) notFound()

    const bundlePlots = bundleResult?.bundlePlots ?? []
    const totalArea = plot.bundle_id
        ? bundlePlots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
        : Number(plot.area_sotok) || 0

    const expectedDistrict = buildDistrictSeoSegment(plot.district)
    const expectedSettlement = buildSettlementSeoSegment(plot.location)
    const expectedSlug = `prodazha-uchastka-${plot.int_id || intId}`

    if (district !== expectedDistrict || settlement !== expectedSettlement || slug !== expectedSlug) {
        permanentRedirect(`${buildPlotSeoPath({ district: plot.district, location: plot.location, intId: plot.int_id || intId })}`)
    }

    const similarPlots = await getSimilarPlots(plot.id, plot.district, 12)

    const areaStr = formatArea(totalArea)
    const isBundle = bundlePlots.length > 1
    
    // Для bundle собираем все КН
    const allCadastralNumbers = isBundle
        ? bundlePlots.map(p => p.cadastral_number).filter(Boolean)
        : plot.cadastral_number ? [plot.cadastral_number] : []
    
    // Для bundle не показываем КН в заголовке (все КН будут ниже отдельной строкой)
    const cadastralDisplay = isBundle 
        ? "" 
        : (allCadastralNumbers.length > 0 ? `КН ${allCadastralNumbers[0]}` : "")
    
    const bundleLabel = isBundle ? ` (${bundlePlots.length} участка)` : ""
    const plotLabel = `Участок ${areaStr}${bundleLabel}${cadastralDisplay ? ` ${cadastralDisplay}` : (!isBundle ? ` ${plot.location || plot.district || "Калининградская область"}` : "")}`

    const primaryPlot = plot.bundle_id
        ? bundlePlots.find((p) => p.is_bundle_primary) ?? plot
        : plot

    const price = Number(primaryPlot?.price ?? plot.price)

    const expectedPath = buildPlotSeoPath({ district: plot.district, location: plot.location, intId: plot.int_id || intId })
    const plotUrl = `https://baltland.ru${expectedPath}`

    const breadcrumbItems = [{ label: "Каталог", href: "/catalog" }]

    if (plot.district) {
        const districtSlug = buildLocationSlug(plot.district)
        breadcrumbItems.push({ label: plot.district, href: `/catalog/${districtSlug}` })
        if (plot.location) {
            const settlementSlug = buildLocationSlug(plot.location)
            breadcrumbItems.push({ label: plot.location, href: `/catalog/${districtSlug}/${settlementSlug}` })
        }
    } else if (plot.location) {
        const settlementSlug = buildLocationSlug(plot.location)
        breadcrumbItems.push({ label: plot.location, href: `/catalog/${settlementSlug}` })
    }

    breadcrumbItems.push({ label: plotLabel, href: expectedPath })

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <PlotJsonLd plot={plot as LandPlot} totalArea={totalArea} price={price} url={plotUrl} />

            <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <SiteBreadcrumb items={breadcrumbItems} className="container mx-auto px-4 py-3" />
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
                    <h1 className="text-2xl md:text-3xl font-semibold mb-1">{plotLabel}</h1>
                    {isBundle && allCadastralNumbers.length > 1 && (
                        <p className="text-base font-bold text-foreground mb-2">
                            КН: {allCadastralNumbers.join(', ')}
                        </p>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>
                            {plot.location}, {plot.district}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        <span className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-lg font-bold">
                            {new Intl.NumberFormat("ru-RU").format(price)} ₽
                        </span>
                        <span className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-full">
                            <Ruler className="h-4 w-4" />
                            {totalArea} соток
                        </span>
                        {plot.land_status && (
                            <span className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-full">
                                {plot.land_status}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <CallbackButtons
                            phone={settings?.phone}
                            plotTitle={plot.title || `Участок ${areaStr}`}
                            cadastralNumber={plot.cadastral_number}
                            plotId={plot.id}
                            location={plot.location || undefined}
                            price={price}
                            areaSotok={totalArea}
                        />
                        <DirectionsButton lat={plot.center_lat} lon={plot.center_lon} />
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* Информация о bundle (продажа одним лотом) */}
                    {isBundle && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-800 mb-2">
                                🏷️ Продажа одним лотом: {bundlePlots.length} участка
                            </h3>
                            <p className="text-sm text-blue-700 mb-3">
                                Общая площадь: <strong>{totalArea} соток</strong> ({(totalArea / 100).toFixed(2)} га)
                            </p>
                            <div className="text-sm text-blue-700">
                                <strong>Кадастровые номера:</strong>
                                <ul className="mt-1 space-y-1">
                                    {bundlePlots.map((bp, idx) => (
                                        <li key={bp.id}>
                                            {idx + 1}. КН {bp.cadastral_number} — {bp.area_sotok} сот.
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {plot.description && (
                        <div>
                            <h2 className="text-xl font-bold mb-4">Описание</h2>
                            <div className="text-muted-foreground leading-relaxed">
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
