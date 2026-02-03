import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type RateLimitAction = "public_submit"

export function getRequestIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }

  const xri = request.headers.get("x-real-ip")
  if (xri) return xri.trim()

  return "unknown"
}

export async function enforceRateLimitOrThrow(input: {
  request: NextRequest
  action?: RateLimitAction
  maxPerHour?: number
}): Promise<{ ip: string; remaining: number }> {
  const action = input.action ?? "public_submit"
  const maxPerHour = input.maxPerHour ?? 3
  const ip = getRequestIp(input.request)

  const supabase = createAdminClient()
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error: countError } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("action", action)
    .gte("created_at", since)

  if (countError) {
    const code = (countError as any).code
    if (code === "42P01") {
      return { ip, remaining: maxPerHour }
    }
    throw new Error(countError.message)
  }

  const used = count ?? 0
  if (used >= maxPerHour) {
    const err: any = new Error("RATE_LIMIT")
    err.code = "RATE_LIMIT"
    err.status = 429
    err.ip = ip
    err.remaining = 0
    throw err
  }

  const { error: insertError } = await supabase
    .from("rate_limit_events")
    .insert({ ip, action })

  if (insertError) {
    const code = (insertError as any).code
    if (code === "42P01") {
      return { ip, remaining: maxPerHour }
    }
    throw new Error(insertError.message)
  }

  return { ip, remaining: Math.max(0, maxPerHour - used - 1) }
}
