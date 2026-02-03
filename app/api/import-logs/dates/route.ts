import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: logs, error } = await supabase
      .from("import_logs")
      .select("imported_at")
      .order("imported_at", { ascending: false })

    if (error) throw error

    // Extract unique dates
    const dates = new Set(
      logs?.map((log) => {
        const date = new Date(log.imported_at)
        return date.toISOString().split("T")[0]
      }) || [],
    )

    return NextResponse.json({ dates: Array.from(dates) })
  } catch (error) {
    console.error("[v0] Error fetching import log dates:", error)
    return NextResponse.json({ error: "Failed to fetch dates" }, { status: 500 })
  }
}
