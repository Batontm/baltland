import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncPlotCoordinates } from "@/app/actions"

// Secret key to protect this endpoint
const SYNC_SECRET = process.env.SYNC_SECRET || "baltland-sync-2026"

export async function POST(request: Request) {
    try {
        // Check auth - either session cookie or secret header
        const cookieStore = await cookies()
        const session = cookieStore.get("admin_session")
        const authHeader = request.headers.get("x-sync-secret")

        if (!session && authHeader !== SYNC_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))
        const limit = Math.min(body.limit || 50, 100)

        const supabase = createAdminClient()

        // Find plots without coordinates that have a cadastral number
        const { data: plots, error } = await supabase
            .from("land_plots")
            .select("id, cadastral_number")
            .is("coordinates_json", null)
            .not("cadastral_number", "is", null)
            .eq("is_active", true)
            .limit(limit)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!plots || plots.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No plots without coordinates found",
                processed: 0,
                found: 0
            })
        }

        console.log(`[sync-coords] Starting sync for ${plots.length} plots`)

        let found = 0
        const results: { cadastral: string; success: boolean; error?: string }[] = []

        for (const plot of plots) {
            try {
                const ok = await syncPlotCoordinates(plot.id, plot.cadastral_number)
                if (ok) found++
                results.push({ cadastral: plot.cadastral_number, success: ok })
                console.log(`[sync-coords] ${plot.cadastral_number}: ${ok ? "✅" : "❌"}`)
            } catch (e: any) {
                results.push({ cadastral: plot.cadastral_number, success: false, error: e.message })
                console.error(`[sync-coords] ${plot.cadastral_number}: error - ${e.message}`)
            }

            // Throttle to respect NSPD API
            await new Promise(resolve => setTimeout(resolve, 1500))
        }

        console.log(`[sync-coords] Done: ${found}/${plots.length} successful`)

        return NextResponse.json({
            success: true,
            processed: plots.length,
            found,
            results
        })
    } catch (error: any) {
        console.error("[sync-coords] Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({
        info: "POST to this endpoint to sync coordinates for plots without geometry",
        params: { limit: "number (max 100)" }
    })
}
