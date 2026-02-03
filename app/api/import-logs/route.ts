import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json({ error: "Date parameter required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: logs, error } = await supabase
      .from("import_logs")
      .select("*")
      .gte("imported_at", startOfDay.toISOString())
      .lte("imported_at", endOfDay.toISOString())
      .order("imported_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[v0] Error fetching import logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
