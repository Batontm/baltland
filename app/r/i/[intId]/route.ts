import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildPlotSeoPath } from "@/lib/utils"

export async function GET(request: NextRequest, { params }: { params: Promise<{ intId: string }> }) {
  const baseUrl = "https://baltland.ru"
  const { intId } = await params
  const parsed = Number(String(intId || "").trim())
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return NextResponse.redirect(new URL("/catalog", baseUrl), 302)
  }

  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from("land_plots")
    .select("id,int_id,district,location")
    .eq("int_id", parsed)
    .limit(1)

  const plot: any = rows?.[0]
  if (!plot) {
    return NextResponse.redirect(new URL("/catalog", baseUrl), 302)
  }

  const path = buildPlotSeoPath({
    district: plot.district,
    location: plot.location,
    intId: plot.int_id || plot.id,
  })

  return NextResponse.redirect(new URL(path, baseUrl), 308)
}
