import { createAdminClient } from "@/lib/supabase/admin"
import { LandPlot } from "@/lib/types"
import { MaxBotFilters } from "@/lib/max-bot/state"

const PAGE_SIZE = 5

export interface BundleMember {
  cadastral_number: string
  area_sotok: number
  ownership_type?: string
}

export interface PlotWithBundle extends LandPlot {
  bundleMembers?: BundleMember[]
  bundleTotalArea?: number
  bundleCount?: number
}

export interface PlotSearchResult {
  plots: PlotWithBundle[]
  hasMore: boolean
}

export async function getAllDistricts(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("land_plots")
    .select("district")
    .eq("is_active", true)
    .not("district", "is", null)
    .order("district", { ascending: true })
    .limit(10000)

  if (error) {
    throw new Error(`getAllDistricts failed: ${error.message}`)
  }

  const unique = new Set<string>()
  for (const row of data || []) {
    const district = typeof (row as { district?: unknown }).district === "string" ? (row as { district: string }).district.trim() : ""
    if (district) unique.add(district)
  }

  return Array.from(unique)
}

export async function getSettlementsByDistrict(district: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("land_plots")
    .select("location")
    .eq("is_active", true)
    .eq("district", district)
    .not("location", "is", null)
    .order("location", { ascending: true })
    .limit(10000)

  if (error) {
    throw new Error(`getSettlementsByDistrict failed: ${error.message}`)
  }

  const unique = new Set<string>()
  for (const row of data || []) {
    const location = typeof (row as { location?: unknown }).location === "string" ? (row as { location: string }).location.trim() : ""
    if (location) unique.add(location)
  }

  return Array.from(unique)
}

async function loadBundleMembers(supabase: ReturnType<typeof createAdminClient>, bundleId: string): Promise<BundleMember[]> {
  const { data } = await supabase
    .from("land_plots")
    .select("cadastral_number, area_sotok, ownership_type")
    .eq("bundle_id", bundleId)
    .eq("is_active", true)
    .order("cadastral_number", { ascending: true })

  return (data || []).map((r: any) => ({
    cadastral_number: r.cadastral_number || "",
    area_sotok: Number(r.area_sotok) || 0,
    ownership_type: r.ownership_type || "ownership",
  }))
}

export async function searchPlots(filters: MaxBotFilters, page: number): Promise<PlotSearchResult> {
  const supabase = createAdminClient()

  // Fetch more plots than needed to account for filtering out bundle members
  const fetchSize = PAGE_SIZE * 3
  const from = 0
  const to = (page + 1) * fetchSize

  let query = supabase
    .from("land_plots")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters.district && filters.district !== "ALL") {
    query = query.eq("district", filters.district)
  }

  if (filters.settlement && filters.settlement !== "ALL") {
    query = query.eq("location", filters.settlement)
  }

  if (filters.landStatus) {
    query = query.eq("land_status", filters.landStatus)
  }

  if (typeof filters.maxPrice === "number") {
    query = query.lte("price", filters.maxPrice)
  }

  if (typeof filters.installment === "boolean") {
    query = query.eq("has_installment", filters.installment)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`searchPlots failed: ${error.message}`)
  }

  const allPlots = (data || []) as LandPlot[]

  // Group by bundle: skip non-primary bundle members (zero-price plots in a bundle)
  const seenBundles = new Set<string>()
  const filtered: LandPlot[] = []

  for (const plot of allPlots) {
    if (plot.bundle_id) {
      const bid = String(plot.bundle_id)
      if (seenBundles.has(bid)) continue
      seenBundles.add(bid)

      // Find the primary plot (the one with price > 0 or is_bundle_primary)
      const bundlePlots = allPlots.filter((p) => String(p.bundle_id) === bid)
      const primary = bundlePlots.find((p) => p.is_bundle_primary) || bundlePlots.find((p) => (p.price || 0) > 0) || plot
      filtered.push(primary)
    } else {
      filtered.push(plot)
    }
  }

  // Paginate after filtering
  const start = page * PAGE_SIZE
  const pagePlots = filtered.slice(start, start + PAGE_SIZE + 1)
  const hasMore = pagePlots.length > PAGE_SIZE
  const resultPlots = pagePlots.slice(0, PAGE_SIZE)

  // Enrich bundle plots with member info
  const enriched: PlotWithBundle[] = []
  for (const plot of resultPlots) {
    if (plot.bundle_id) {
      const members = await loadBundleMembers(supabase, String(plot.bundle_id))
      const totalArea = members.reduce((sum, m) => sum + m.area_sotok, 0)
      enriched.push({
        ...plot,
        bundleMembers: members,
        bundleTotalArea: totalArea || Number(plot.area_sotok) || 0,
        bundleCount: members.length,
      })
    } else {
      enriched.push(plot)
    }
  }

  return {
    plots: enriched,
    hasMore,
  }
}
