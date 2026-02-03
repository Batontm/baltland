import { notFound, permanentRedirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft, MapPin, Ruler, Flame, Droplets, FileText, Zap, Phone, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getLandPlotBundleById, getOrganizationSettings, getSimilarPlots } from "@/app/actions"
import { CallbackButtons } from "@/components/plots/callback-buttons"
import { PlotHeroMapWrapper } from "@/components/plots/plot-hero-map-wrapper"
import type { LandPlot } from "@/lib/types"
import { buildPlotSlug } from "@/lib/utils"
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
  const canonicalId = plot.int_id ? String(plot.int_id) : plot.id
  const canonical = `${baseUrl}/uchastok/${canonicalSlug}`

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

  const descriptionSource = primaryPlot?.description ?? plot.description ?? ""
  const description = (() => {
    // If plot has custom description, use it
    if (descriptionSource) return truncate(toPlainText(descriptionSource), 160)

    // Generate unique description with specific plot data
    const priceRaw = Number(primaryPlot?.price ?? plot.price)
    const priceText = Number.isFinite(priceRaw) && priceRaw > 0
      ? new Intl.NumberFormat("ru-RU").format(priceRaw) + " ₽"
      : ""

    // Build utilities list
    const utilities: string[] = []
    if (plot.has_gas) utilities.push("газ")
    if (plot.has_electricity) utilities.push("электричество")
    if (plot.has_water) utilities.push("вода")
    const utilitiesText = utilities.length > 0 ? utilities.join(", ") : "без коммуникаций"

    // Build unique description: Area + Price + Utilities + Location + Cadastral
    const descParts = [
      `Земельный участок ${totalArea} соток`,
      priceText ? `за ${priceText}` : "",
      `в ${locationLabel || "Калининградской области"}`,
      `(${utilitiesText})`,
      plot.land_status ? `Категория: ${plot.land_status}` : "",
      cadastral ? `Кадастр: ${cadastral}` : "",
    ].filter(Boolean)

    return truncate(descParts.join(". ").replace(/\.\s*\(/g, " ("), 160)
  })()

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
  const canonicalId = plot.int_id ? String(plot.int_id) : plot.id

  // Always redirect to new SEO-friendly URL
  permanentRedirect(`/uchastok/${canonicalSlug}`)

  const cadastralNumbers = plot.bundle_id
    ? bundlePlots
      .map((p) => p.cadastral_number)
      .filter((v): v is string => !!v)
      .sort((a, b) => a.localeCompare(b))
    : plot.cadastral_number
      ? [plot.cadastral_number]
      : []

  const formatOwnershipLabel = (p: LandPlot) => {
    if (p.is_reserved) return "забронировано"
    if (String(p.ownership_type || "ownership") === "lease") return "аренда"
    return "собственность"
  }

  const cadastralEntries = plot.bundle_id
    ? bundlePlots
      .slice()
      .sort((a, b) => String(a.cadastral_number || "").localeCompare(String(b.cadastral_number || "")))
      .map((p) => {
        const cn = p.cadastral_number
        if (!cn) return null
        return `${cn} (${formatOwnershipLabel(p)})`
      })
      .filter((v): v is string => !!v)
    : cadastralNumbers

  const baseUrl = "https://baltland.ru"

  const title = primaryPlot?.title ?? plot.title
  const price = Number(primaryPlot?.price ?? plot.price)
  const imageUrl = plot.image_url || undefined

  const youtubeEmbedUrl = getYouTubeEmbedUrl((plot as any)?.youtube_video_url)
  const rutubeEmbedUrl = getRuTubeEmbedUrl((plot as any)?.rutube_video_url)

  // Location for breadcrumbs
  const locationLabel = String(plot.location || "").trim() || String(plot.district || "").trim()

  // Get all images for gallery
  const allImages = [
    plot.image_url,
    ...(Array.isArray((plot as any).photos) ? (plot as any).photos : []),
  ].filter((url): url is string => !!url && typeof url === "string")

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: title,
    description: primaryPlot?.description ?? plot.description ?? undefined,
    image: allImages.length > 0 ? allImages : undefined,
    url: `${baseUrl}/plots/${plot.int_id || plot.id}/${canonicalSlug}`,
    datePosted: plot.created_at,
    offers: {
      "@type": "Offer",
      price: Number.isFinite(price) ? price : undefined,
      priceCurrency: "RUB",
      availability: plot.is_reserved ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `${baseUrl}/plots/${plot.int_id || plot.id}/${canonicalSlug}`,
    },
    geo: (plot as any).latitude && (plot as any).longitude ? {
      "@type": "GeoCoordinates",
      latitude: (plot as any).latitude,
      longitude: (plot as any).longitude,
    } : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: plot.location || plot.district || "Калининградская область",
      addressRegion: "Калининградская область",
      addressCountry: "RU",
    },
    floorSize: {
      "@type": "QuantitativeValue",
      value: totalArea * 100, // Convert sotok to sq meters
      unitCode: "MTK",
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Площадь",
        value: totalArea,
        unitText: "соток",
      },
      {
        "@type": "PropertyValue",
        name: "Кадастровый номер",
        value: plot.cadastral_number || undefined,
      },
    ].filter(p => p.value),
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Header */}
      <Header />

      {/* Breadcrumbs - Sticky below header */}
      <div className="sticky top-[4.5rem] z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <SiteBreadcrumb
          items={[
            { label: "Каталог", href: "/catalog" },
            { label: locationLabel || "Участок", href: `/catalog/${buildPlotSlug({ location: locationLabel })}` },
            { label: title || "Участок", href: `/plots/${plot.int_id || plot.id}/${canonicalSlug}` },
          ]}
          className="container mx-auto px-4 py-3"
        />
      </div>

      {/* Hero Map Section */}
      <section className="relative px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <PlotHeroMapWrapper
            plot={plot as LandPlot}
            bundlePlots={bundlePlots as LandPlot[]}
            totalArea={totalArea}
            price={price}
            phone={settings?.phone}
          />
        </div>
      </section>

      {/* Plot Info Card - overlaps map slightly */}
      <section className="relative -mt-16 z-10 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Semi-transparent top edge that overlaps map */}
          <div className="h-8 bg-gradient-to-b from-white/60 to-white rounded-t-3xl backdrop-blur-sm" />
          {/* Info card content */}
          <div className="bg-white shadow-lg px-6 pb-6 pt-4 rounded-b-3xl">
            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-semibold mb-2">
              {bundlePlots.length > 1
                ? `Участок ${totalArea} сот., ${plot.location || plot.district || 'Калининградская область'}`
                : plot.title
              }
            </h1>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-muted-foreground mb-4">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                {plot.location && `${plot.location}`}
                {plot.location && plot.district && ", "}
                {plot.district && plot.district
                  .replace(/,?\s*Калининградская область/i, "")
                  .replace(/\s+район/i, " (р-н)")
                  .replace(/городской округ/i, "г.о.")
                  .trim()}
                {!plot.location && !plot.district && 'Калининградская область'}
              </span>
            </div>

            {/* Bundle badge and cadastral numbers */}
            {bundlePlots.length > 1 && (
              <>
                <div className="mb-4">
                  <span className="inline-block bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full">
                    🔗 Продаются вместе ({bundlePlots.length} участков)
                  </span>
                </div>
                <div className="mb-4 space-y-1.5">
                  {cadastralEntries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-slate-600">{entry}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                {new Intl.NumberFormat('ru-RU').format(price)} ₽
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm">
                <Ruler className="h-4 w-4" />
                {totalArea} соток
              </span>
              <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm">
                {plot.land_status || "ИЖС"}
              </span>
            </div>

            {/* Utilities */}
            <div className="flex flex-wrap gap-2 mb-4">
              {plot.has_gas && <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">🔥 Газ</span>}
              {plot.has_electricity && <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">⚡ Свет</span>}
              {plot.has_water && <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">💧 Вода</span>}
            </div>

            {/* Buttons */}
            <CallbackButtons
              phone={settings?.phone}
              plotTitle={bundlePlots.length > 1
                ? `Участок ${totalArea} сот., ${plot.location || plot.district || 'Калининградская область'}`
                : plot.title || 'Участок'
              }
              cadastralNumber={primaryPlot?.cadastral_number || plot.cadastral_number}
              plotId={plot.id}
              location={plot.location || plot.district}
              price={plot.price}
              areaSotok={totalArea}
            />
          </div>
        </div>
      </section>

      {/* Detailed Info Section */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Description */}
          {(primaryPlot?.description ?? plot.description) && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Описание</h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {renderRichText(primaryPlot?.description ?? plot.description ?? "")}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video */}
          {(youtubeEmbedUrl || rutubeEmbedUrl) && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Видео</h2>
                {youtubeEmbedUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <iframe
                      src={youtubeEmbedUrl}
                      title="YouTube video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                )}
                {!youtubeEmbedUrl && rutubeEmbedUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <iframe
                      src={rutubeEmbedUrl}
                      title="RuTube video"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}


          {/* Similar Plots */}
          {similarPlots.length > 0 && (
            <div>
              <h2 className="text-2xl font-serif font-semibold mb-6">Похожие участки</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarPlots.map((sp) => {
                  const spArea = Number(sp.area_sotok) || 0
                  const spSlug = buildPlotSlug({ location: sp.location, district: sp.district, areaSotok: spArea })
                  const spPrice = Number(sp.price) || 0
                  return (
                    <Link key={sp.id} href={`/plots/${sp.id}/${spSlug}`}>
                      <Card className="overflow-hidden rounded-2xl hover:shadow-lg transition-shadow">
                        <div className="aspect-[4/3] bg-muted relative">
                          {sp.image_url ? (
                            <img
                              src={sp.image_url}
                              alt={sp.title || "Участок"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                          {sp.land_status && (
                            <Badge className="absolute top-3 left-3 bg-white/90 text-slate-700 hover:bg-white">
                              {sp.land_status}
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="font-semibold text-lg mb-1">
                            {spPrice > 0 ? new Intl.NumberFormat("ru-RU").format(spPrice) + " ₽" : "Цена по запросу"}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {sp.location || sp.district || "Калининградская область"}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Ruler className="h-4 w-4" />
                            <span>{spArea} соток</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
              <div className="text-center mt-6">
                <Link href="/catalog" className="text-primary hover:underline font-medium">
                  Смотреть все участки →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
