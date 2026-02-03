import { MetadataRoute } from "next"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { SEO_PAGES } from "@/config/seo-pages"
import { buildPlotSlug } from "@/lib/utils"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://baltland.ru"
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ]

  const seoRoutes: MetadataRoute.Sitemap = Object.keys(SEO_PAGES).map((slug) => ({
    url: `${baseUrl}/catalog/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return [...staticRoutes, ...seoRoutes]
  }

  const supabase = (() => {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return createAdminClient()
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    }
    return null
  })()

  if (!supabase) return staticRoutes

  const [plotsRes, newsRes] = await Promise.all([
    supabase
      .from("land_plots")
      .select("id, int_id, updated_at, location, district, area_sotok, bundle_id, is_bundle_primary")
      .eq("is_active", true),
    supabase.from("news").select("id, published_at, updated_at").eq("is_published", true),
  ])

  const plots = plotsRes.error ? [] : (plotsRes.data || [])
  const news = newsRes.error ? [] : (newsRes.data || [])

  const plotRoutes: MetadataRoute.Sitemap = (() => {
    const out: MetadataRoute.Sitemap = []
    const byBundle = new Map<
      string,
      {
        totalArea: number
        primary: any | null
        lastModified: Date | undefined
      }
    >()

    const singles: any[] = []

    for (const p of plots) {
      const bundleId = p?.bundle_id ? String(p.bundle_id) : ""
      const updatedAt = p?.updated_at ? new Date(p.updated_at) : undefined
      if (!bundleId) {
        singles.push(p)
        continue
      }

      const entry = byBundle.get(bundleId) || { totalArea: 0, primary: null, lastModified: undefined }
      entry.totalArea += Number(p?.area_sotok) || 0
      if (p?.is_bundle_primary) entry.primary = p
      if (!entry.lastModified || (updatedAt && updatedAt > entry.lastModified)) entry.lastModified = updatedAt
      byBundle.set(bundleId, entry)
    }

    // singles
    for (const p of singles) {
      const area = Number(p?.area_sotok) || 0
      const slug = buildPlotSlug({
        location: p?.location || undefined,
        district: p?.district || undefined,
        areaSotok: area,
        id: p.int_id || p.id
      })
      out.push({
        url: `${baseUrl}/uchastok/${slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }

    // bundles
    for (const [bundleId, meta] of byBundle.entries()) {
      const p = meta.primary || plots.find((x) => String(x.bundle_id) === bundleId)
      if (!p) continue

      const slug = buildPlotSlug({
        location: p?.location || undefined,
        district: p?.district || undefined,
        areaSotok: meta.totalArea,
        id: p.int_id || p.id
      })
      out.push({
        url: `${baseUrl}/uchastok/${slug}`,
        lastModified: meta.lastModified,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }

    return out
  })()

  // Dynamic Catalog routes
  const catalogRoutes: MetadataRoute.Sitemap = (() => {
    const out: MetadataRoute.Sitemap = []
    const processedDistricts = new Set<string>()
    const processedSettlements = new Set<string>()

    for (const p of plots) {
      if (p.district) {
        const districtSlug = buildPlotSlug({ district: p.district })
        if (!processedDistricts.has(districtSlug)) {
          processedDistricts.add(districtSlug)
          out.push({
            url: `${baseUrl}/catalog/${districtSlug}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8,
          })
        }

        if (p.location) {
          const settlementSlug = buildPlotSlug({ location: p.location })
          const hierarchySlug = `${districtSlug}/${settlementSlug}`
          if (!processedSettlements.has(hierarchySlug)) {
            processedSettlements.add(hierarchySlug)
            out.push({
              url: `${baseUrl}/catalog/${hierarchySlug}`,
              lastModified: now,
              changeFrequency: "weekly",
              priority: 0.7,
            })
          }
        }
      }
    }
    return out
  })()

  const newsRoutes: MetadataRoute.Sitemap = (news || []).map((n: any) => ({
    url: `${baseUrl}/news/${n.id}`,
    lastModified: n.published_at ? new Date(n.published_at) : n.updated_at ? new Date(n.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.5,
  }))

  return [...staticRoutes, ...seoRoutes, ...catalogRoutes, ...plotRoutes, ...newsRoutes]
}
