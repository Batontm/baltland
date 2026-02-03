import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

type SupabaseDatabase = any

let adminClientInstance: SupabaseClient<SupabaseDatabase> | null = null

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

function validateSupabaseUrl(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`)
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL must be http(s): ${url}`)
  }
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL points to localhost (${url}). It must point to your Supabase project URL.`)
  }
}

// Helper to create a fetch with timeout
const fetchWithTimeout = (timeout = 45000): typeof fetch => {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(id);
    }
  };
};

// Admin client that bypasses RLS using service role key
export function createAdminClient() {
  if (adminClientInstance) {
    return adminClientInstance
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY)
  validateSupabaseUrl(supabaseUrl)

  const fetchTimeoutMsRaw = process.env.SUPABASE_FETCH_TIMEOUT_MS
  const fetchTimeoutMs = fetchTimeoutMsRaw ? Number(fetchTimeoutMsRaw) : 45000

  adminClientInstance = createSupabaseClient<SupabaseDatabase>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithTimeout(Number.isFinite(fetchTimeoutMs) ? fetchTimeoutMs : 45000)
    }
  })

  return adminClientInstance
}

// Server client that respects RLS and uses cookies for auth
export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const fetchTimeoutMsRaw = process.env.SUPABASE_FETCH_TIMEOUT_MS
  const fetchTimeoutMs = fetchTimeoutMsRaw ? Number(fetchTimeoutMsRaw) : 15000

  return createSupabaseClient<SupabaseDatabase>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
      fetch: fetchWithTimeout(Number.isFinite(fetchTimeoutMs) ? fetchTimeoutMs : 15000)
    },
  })
}
