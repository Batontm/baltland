import { NextResponse, type NextRequest } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { retryMissingPlotGeometry } from "@/app/actions"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function isCronAuthorized(request: NextRequest) {
  const expected = process.env.CRON_TOKEN
  if (!expected) return false

  const headerToken = request.headers.get("x-cron-token")
  const queryToken = request.nextUrl.searchParams.get("token")
  const provided = (headerToken || queryToken || "").trim()
  return provided !== "" && provided === expected
}

export async function POST(request: NextRequest) {
  const cronOk = isCronAuthorized(request)
  if (!cronOk) {
    const session = await getAdminSession()
    if (!session) return jsonError("Unauthorized", 401)
  }

  const body = await request.json().catch(() => ({}))
  const limitRaw = (body as any)?.limit
  const limit = typeof limitRaw === "number" ? limitRaw : Number(limitRaw || 30)

  try {
    const res = await retryMissingPlotGeometry(Number.isFinite(limit) ? limit : 30)
    return NextResponse.json(res)
  } catch (e: any) {
    return jsonError(e?.message || "Ошибка синхронизации", 500)
  }
}
