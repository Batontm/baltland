import { createAdminClient } from "@/lib/supabase/admin"
import { LandPlot } from "@/lib/types"
import { MaxBotFilters } from "@/lib/max-bot/state"

const PAGE_SIZE = 5

export interface PlotSearchResult {
  plots: LandPlot[]
  hasMore: boolean
}

export async function searchPlots(filters: MaxBotFilters, page: number): Promise<PlotSearchResult> {
  const supabase = createAdminClient()
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE

  let query = supabase
    .from("land_plots")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters.district && filters.district !== "ALL") {
    query = query.eq("district", filters.district)
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

  const plots = (data || []) as LandPlot[]
  return {
    plots: plots.slice(0, PAGE_SIZE),
    hasMore: plots.length > PAGE_SIZE,
  }
}
