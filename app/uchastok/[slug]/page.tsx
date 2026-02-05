
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { getLandPlotBundleById, getOrganizationSettings, getSimilarPlots } from "@/app/actions"
import type { LandPlot } from "@/lib/types"
import { buildPlotSlug, buildPlotSeoPath, formatArea, parseIdFromSlug } from "@/lib/utils"
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

function formatPriceRub(value: number) {
    if (!Number.isFinite(value) || value <= 0) return ""
    return new Intl.NumberFormat("ru-RU").format(value) + " руб."
}

function buildPlotMetaDescription(plot: LandPlot, totalArea: number) {
    const areaStr = formatArea(totalArea)
    const locationLabel = String(plot.location || "").trim() || String(plot.district || "").trim() || "Калининградской области"
    const status = String(plot.land_status || "").trim()
    const cadastral = String(plot.cadastral_number || "").trim()
    const price = formatPriceRub(Number(plot.price))

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
    const areaStr = formatArea(totalArea)
    const title = `Участок ${areaStr} в ${plot.location || plot.district}${cadastral ? ` | ${cadastral}` : ""}`
    const description = buildPlotMetaDescription(plot, totalArea)

    const seoPath = buildPlotSeoPath({
        district: plot.district,
        location: plot.location,
        intId: plot.int_id || plot.id,
    })

    return {
        title: `${title} | БалтикЗемля`,
        description,
        alternates: { canonical: `https://baltland.ru${seoPath}` },
        openGraph: {
            title,
            description,
            url: `https://baltland.ru${seoPath}`,
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
        redirect(`/uchastok/${expectedSlug}`)
    }

    const seoPath = buildPlotSeoPath({
        district: plot.district,
        location: plot.location,
        intId: plot.int_id || plot.id,
    })

    redirect(seoPath)
}
