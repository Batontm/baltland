import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveLocationByCadastral } from "@/app/actions"

const SYNC_SECRET = process.env.SYNC_SECRET || "baltland-sync-2026"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("admin_session")
    const authHeader = request.headers.get("x-sync-secret")

    if (!session && authHeader !== SYNC_SECRET) {
      return jsonError("Unauthorized", 401)
    }

    const body = (await request.json().catch(() => ({}))) as any
    const locationsRaw = body?.locations
    const limitRaw = body?.limit
    const delayMsRaw = body?.delayMs

    const locations = Array.isArray(locationsRaw)
      ? locationsRaw.map((v) => String(v || "").trim()).filter(Boolean)
      : []

    if (locations.length === 0) {
      return jsonError("locations[] is required", 400)
    }

    const limit = Math.min(
      200,
      Math.max(1, typeof limitRaw === "number" ? limitRaw : Number(limitRaw || 200)),
    )

    const delayMs = Math.min(
      3000,
      Math.max(0, typeof delayMsRaw === "number" ? delayMsRaw : Number(delayMsRaw || 500)),
    )

    const supabase = createAdminClient()

    const { data: plots, error } = await supabase
      .from("land_plots")
      .select("id,cadastral_number,location,district")
      .in("location", locations)
      .not("cadastral_number", "is", null)
      .limit(limit)

    if (error) return jsonError(error.message, 500)

    const rows = (plots || []) as Array<{
      id: string
      cadastral_number: string
      location: string | null
      district: string | null
    }>

    const results: Array<{
      id: string
      cadastral_number: string
      before: { district: string | null; location: string | null }
      after?: { district?: string; location?: string }
      updated: boolean
      error?: string
      nspd_address?: string
      debug?: any
    }> = []

    let updated = 0

    for (const plot of rows) {
      try {
        const res = await resolveLocationByCadastral(plot.cadastral_number)

        const nextDistrict = res.district
        const nextLocation = res.location

        if (nextDistrict || nextLocation) {
          const patch: Record<string, any> = {}
          if (nextDistrict) patch.district = nextDistrict
          if (nextLocation) patch.location = nextLocation

          const { error: updErr } = await supabase.from("land_plots").update(patch).eq("id", plot.id)

          if (updErr) {
            results.push({
              id: plot.id,
              cadastral_number: plot.cadastral_number,
              before: { district: plot.district, location: plot.location },
              after: { district: nextDistrict, location: nextLocation },
              updated: false,
              error: updErr.message,
              nspd_address: res.nspd_address,
              debug: res.debug,
            })
          } else {
            updated++
            results.push({
              id: plot.id,
              cadastral_number: plot.cadastral_number,
              before: { district: plot.district, location: plot.location },
              after: { district: nextDistrict, location: nextLocation },
              updated: true,
              nspd_address: res.nspd_address,
              debug: res.debug,
            })
          }
        } else {
          results.push({
            id: plot.id,
            cadastral_number: plot.cadastral_number,
            before: { district: plot.district, location: plot.location },
            updated: false,
            error: res.error || "No location resolved",
            nspd_address: res.nspd_address,
            debug: res.debug,
          })
        }
      } catch (e: any) {
        results.push({
          id: plot.id,
          cadastral_number: plot.cadastral_number,
          before: { district: plot.district, location: plot.location },
          updated: false,
          error: e?.message || String(e),
        })
      }

      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }

    return NextResponse.json({
      success: true,
      requested_locations: locations,
      limit,
      processed: rows.length,
      updated,
      results,
    })
  } catch (e: any) {
    return jsonError(e?.message || String(e), 500)
  }
}
