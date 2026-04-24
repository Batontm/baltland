import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import bcrypt from "bcryptjs"
import { sendMessageToAdmin } from "@/lib/telegram"
import { sendMagicLinkEmail } from "@/lib/email"
import crypto from "crypto"

type FailureKey = string

const failureWindowMs = 60_000
const failureNotifyEvery = 5
const failuresByKey = new Map<FailureKey, { count: number; firstAt: number; lastNotifiedAt: number }>()

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getClientIp(request: NextRequest) {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

async function notifyLoginSuccess(request: NextRequest, username: string) {
  const ip = getClientIp(request)
  const ua = request.headers.get("user-agent") ?? ""
  const msg = `✅ <b>Вход в админку</b>\n\n👤 <b>Логин:</b> <code>${escapeHtml(username)}</code>\n🌐 <b>IP:</b> <code>${escapeHtml(ip)}</code>${ua ? `\n🧭 <b>UA:</b> <code>${escapeHtml(ua)}</code>` : ""}`
  await sendMessageToAdmin(msg, 'auth')
}

async function notifyLoginFailure(request: NextRequest, username: string) {
  const ip = getClientIp(request)
  const ua = request.headers.get("user-agent") ?? ""
  const key: FailureKey = `${ip}::${username}`
  const now = Date.now()
  const existing = failuresByKey.get(key)
  const current = existing && now - existing.firstAt <= failureWindowMs
    ? { ...existing, count: existing.count + 1 }
    : { count: 1, firstAt: now, lastNotifiedAt: 0 }

  failuresByKey.set(key, current)

  const shouldNotify =
    current.count === 1 ||
    (current.count % failureNotifyEvery === 0 && now - current.lastNotifiedAt >= 5_000)

  if (!shouldNotify) return

  current.lastNotifiedAt = now
  failuresByKey.set(key, current)

  const msg = `🚨 <b>Неудачная попытка входа в админку</b>\n\n👤 <b>Логин:</b> <code>${escapeHtml(username)}</code>\n🌐 <b>IP:</b> <code>${escapeHtml(ip)}</code>\n🔁 <b>Попыток за 1 минуту:</b> <b>${current.count}</b>${ua ? `\n🧭 <b>UA:</b> <code>${escapeHtml(ua)}</code>` : ""}`
  await sendMessageToAdmin(msg, 'auth')
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ========== LOGIN ATTEMPT START ==========")
    const body = await request.json()
    const { username, password } = body

    console.log("[v0] Received credentials:", { username, passwordLength: password?.length })

    const supabase = createAdminClient()
    console.log("[v0] Supabase admin client created")

    const { data: users, error: queryError } = await supabase
      .from("admin_users")
      .select("id, username, password_hash, telegram_chat_id")
      .eq("username", username)
      .limit(1)

    console.log("[v0] Database query completed")
    console.log("[v0] Query error:", queryError)
    console.log("[v0] Users found:", users?.length || 0)

    if (queryError) {
      console.error("[v0] Login API: Query error details:", JSON.stringify(queryError))
      return NextResponse.json({ success: false, error: "Ошибка сервера" }, { status: 500 })
    }

    const user = users?.[0]

    const isActive = user ? (((user as any).is_active ?? true) as boolean) : false

    if (user) {
      console.log("[v0] User found:", {
        id: user.id,
        username: user.username,
        is_active: (user as any).is_active,
        has_password_hash: !!user.password_hash,
        password_hash_length: user.password_hash?.length,
        password_hash_prefix: user.password_hash?.substring(0, 10),
      })
    } else {
      console.log("[v0] No user found with username:", username)
    }

    if (!user || !isActive) {
      console.log("[v0] Login failed: User not found or inactive")
      await notifyLoginFailure(request, String(username ?? ""))
      return NextResponse.json({ success: false, error: "Неверный логин или пароль" }, { status: 401 })
    }

    console.log("[v0] Starting password comparison...")
    console.log("[v0] Password to compare:", password)
    console.log("[v0] Hash from database:", user.password_hash)

    const isValid = await bcrypt.compare(password, user.password_hash)

    console.log("[v0] Password comparison result:", isValid)

    if (!isValid) {
      console.log("[v0] Login failed: Invalid password")
      await notifyLoginFailure(request, String(username ?? ""))
      return NextResponse.json({ success: false, error: "Неверный логин или пароль" }, { status: 401 })
    }

    // Step 1 passed: password is valid. Send magic link via email.
    const magicToken = crypto.randomBytes(32).toString("base64url")
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

    await supabase.from("admin_login_otps").insert({
      admin_user_id: user.id,
      otp_token: magicToken,
      otp_hash: "magic_link",
      expires_at: expiresAt,
    })

    try {
      await sendMagicLinkEmail(magicToken)
      console.log("[v0] Magic link email sent successfully")
    } catch (emailError) {
      console.error("[v0] Failed to send magic link email:", emailError)
      return NextResponse.json({ success: false, error: "Не удалось отправить письмо" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      requires_magic_link: true,
    })
  } catch (error) {
    console.error("[v0] Login API error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack")
    console.log("[v0] ========== LOGIN ATTEMPT END (ERROR) ==========")
    return NextResponse.json(
      {
        success: false,
        error: "Ошибка сервера",
      },
      { status: 500 },
    )
  }
}
