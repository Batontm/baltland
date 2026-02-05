import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, MapPin, Ruler, Flame, Droplets, FileText, Zap, Phone, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getLandPlotBundleById, getOrganizationSettings, getSimilarPlots } from "@/app/actions"
import { CallbackButtons } from "@/components/plots/callback-buttons"
import { PlotHeroMapWrapper } from "@/components/plots/plot-hero-map-wrapper"
import type { LandPlot } from "@/lib/types"
import { buildPlotSlug, buildPlotSeoPath } from "@/lib/utils"
import { Header } from "@/components/calming/header"
import { Footer } from "@/components/calming/footer"
import { SiteBreadcrumb } from "@/components/site-breadcrumb"

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

function buildPlotMetaDescription(plot: LandPlot, totalArea: number, priceRaw: number) {
  const locationLabel = String(plot.location || "").trim() || String(plot.district || "").trim() || "Калининградской области"
  const cadastral = String(plot.cadastral_number || "").trim()
  const status = String(plot.land_status || "").trim()
  const price = formatPriceRub(priceRaw)

  const utilities: string[] = []
  if (plot.has_electricity) utilities.push("свет по границе")
  if (plot.has_gas) utilities.push("газ")
  if (plot.has_water) utilities.push("вода")
  const utilitiesText = utilities.length ? utilities.join(", ") : "коммуникации уточняйте"

  const parts = [
    `Купить участок ${totalArea} соток`,
    locationLabel ? `в ${locationLabel}` : "",
    status ? `(${status})` : "",
    utilitiesText ? `${utilitiesText}.` : "",
    cadastral ? `Кадастровый номер ${cadastral}.` : "",
    price ? `Цена ${price}.` : "",
  ].filter(Boolean)

  return truncate(parts.join(" ").replace(/\s+/g, " ").trim(), 160)
}

function getYouTubeEmbedUrl(rawUrl: string | null | undefined): string | null {
  const raw = String(rawUrl || "").trim()
  if (!raw) return null

  if (/^[a-zA-Z0-9_-]{6,}$/.test(raw) && !raw.includes("/")) {
    return `https://www.youtube-nocookie.com/embed/${raw}`
  }

  try {
    const u = new URL(raw)
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "")
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`
    }

    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v")
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`

      const m = u.pathname.match(/\/embed\/([^/?#]+)/)
      if (m?.[1]) return `https://www.youtube-nocookie.com/embed/${m[1]}`
    }
  } catch {
    // ignore
  }

  return null
}

function getRuTubeEmbedUrl(rawUrl: string | null | undefined): string | null {
  const raw = String(rawUrl || "").trim()
  if (!raw) return null

  if (/^[a-zA-Z0-9_-]{6,}$/.test(raw) && !raw.includes("/")) {
    return `https://rutube.ru/play/embed/${raw}`
  }

  try {
    const u = new URL(raw)
    if (!u.hostname.includes("rutube.ru")) return null

    const mVideo = u.pathname.match(/\/video\/([^/?#]+)/)
    if (mVideo?.[1]) return `https://rutube.ru/play/embed/${mVideo[1]}`

    const mEmbed = u.pathname.match(/\/play\/embed\/([^/?#]+)/)
    if (mEmbed?.[1]) return `https://rutube.ru/play/embed/${mEmbed[1]}`
  } catch {
    // ignore
  }

  return null
}

function getCanonicalSlug(plot: LandPlot, totalArea: number) {
  return buildPlotSlug({
    location: plot.location || null,
    district: plot.district || null,
    areaSotok: Number.isFinite(totalArea) ? totalArea : null,
  })
}

export async function generateMetadata({
  params,
}: {
  params: { id: string; slug: string } | Promise<{ id: string; slug: string }>
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params)
  const bundleResult = await getLandPlotBundleById(resolvedParams.id)

  const plot = bundleResult?.plot ?? null
  const bundlePlots = bundleResult?.bundlePlots ?? []

  if (!plot) {
    return {
      title: "Участок не найден | БалтикЗемля",
      robots: { index: false, follow: false },
    }
  }

  const primaryPlot = plot.bundle_id ? bundlePlots.find((p) => p.is_bundle_primary) ?? plot : plot
  const totalArea = plot.bundle_id
    ? bundlePlots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
    : Number(plot.area_sotok) || 0

  const baseUrl = "https://baltland.ru"
  const canonicalSlug = getCanonicalSlug(plot as any, totalArea)
  const canonical = `${baseUrl}${buildPlotSeoPath({ district: plot.district, location: plot.location, intId: plot.int_id || plot.id })}`

  const locationLabel = String(plot.location || "").trim() || String(plot.district || "").trim()
  const areaLabel = totalArea ? `${totalArea} сот.` : ""

  // Full cadastral number for SEO uniqueness
  const cadastral = String(plot.cadastral_number || "").trim()

  // New format: "Участок 5 сот. в Голубево | КН 39:03:060012:3698"
  const titleParts = [
    `Участок${areaLabel ? ` ${areaLabel}` : ""}${locationLabel ? ` в ${locationLabel}` : ""}`,
    cadastral ? `КН ${cadastral}` : null,
  ].filter(Boolean)
  const title = titleParts.join(" | ")

  const priceRaw = Number(primaryPlot?.price ?? plot.price)
  const description = buildPlotMetaDescription(plot, totalArea, priceRaw)

  const imageUrl = plot.image_url || undefined

  return {
    title: `${title} | БалтикЗемля`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
  }
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

interface PlotPageProps {
  params: Promise<{ id: string; slug: string }>
}

export default async function PlotPage({ params }: PlotPageProps) {
  const { id, slug } = await params
  const [bundleResult, settings] = await Promise.all([getLandPlotBundleById(id), getOrganizationSettings()])

  const plot = bundleResult?.plot ?? null
  const bundlePlots = bundleResult?.bundlePlots ?? []

  // Fetch similar plots
  const similarPlots = plot ? await getSimilarPlots(plot.id, plot.district, 3) : []

  if (!plot) {
    notFound()
  }

  const primaryPlot = plot.bundle_id
    ? bundlePlots.find((p) => p.is_bundle_primary) ?? plot
    : plot

  const totalArea = plot.bundle_id
    ? bundlePlots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
    : Number(plot.area_sotok) || 0

  const canonicalSlug = getCanonicalSlug(plot as any, totalArea)
  const seoPath = buildPlotSeoPath({ district: plot.district, location: plot.location, intId: plot.int_id || plot.id })

  // Always redirect to canonical SEO URL
  redirect(seoPath)
}
