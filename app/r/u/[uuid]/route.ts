import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildPlotSeoPath } from "@/lib/utils"

export async function GET(request: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const baseUrl = "https://baltland.ru"
  const { uuid } = await params
  const id = String(uuid || "").trim()

  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.redirect(new URL("/catalog", baseUrl), 302)
  }

  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from("land_plots")
    .select("id,int_id,district,location")
    .eq("id", id)
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
