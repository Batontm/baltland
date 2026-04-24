import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAdminSession } from "@/lib/admin-auth"
import { sendMessageToAdmin } from "@/lib/telegram"

function getClientIp(request: NextRequest) {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return redirectWithError("Ссылка недействительна")
    }

    const supabase = createAdminClient()

    // Find the magic link token
    const { data: rows, error } = await supabase
      .from("admin_login_otps")
      .select("id, admin_user_id, otp_hash, expires_at, consumed_at")
      .eq("otp_token", token)
      .limit(1)

    if (error) {
      console.error("[Magic Link] DB error:", error)
      return redirectWithError("Ошибка сервера")
    }

    const row: any = rows?.[0]
    if (!row) {
      return redirectWithError("Ссылка недействительна или устарела")
    }

    // Check if it's a magic link token
    if (row.otp_hash !== "magic_link") {
      return redirectWithError("Ссылка недействительна")
    }

    // Check if already consumed
    if (row.consumed_at) {
      return redirectWithError("Ссылка уже использована")
    }

    // Check expiration
    const expiresAt = new Date(row.expires_at).getTime()
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return redirectWithError("Ссылка истекла")
    }

    // Get user
    const { data: users, error: userError } = await supabase
      .from("admin_users")
      .select("id, username")
      .eq("id", row.admin_user_id)
      .limit(1)

    if (userError || !users || users.length === 0) {
      return redirectWithError("Пользователь не найден")
    }

    const user: any = users[0]

    // Mark token as consumed
    await supabase
      .from("admin_login_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id)

    // Create session
    const sessionToken = await createAdminSession(user.id, user.username)

    // Notify via Telegram
    const ip = getClientIp(request)
    sendMessageToAdmin(
      `✅ <b>Вход в админку (magic link)</b>\n\n👤 <b>Логин:</b> <code>${user.username}</code>\n🌐 <b>IP:</b> <code>${ip}</code>`,
      'auth'
    ).catch(() => {})

    // Redirect to admin with session cookie
    const forwardedProto = request.headers.get("x-forwarded-proto")
    const proto = forwardedProto ?? request.nextUrl.protocol.replace(":", "")
    const isHttps = proto === "https"

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://baltland.ru"
    const response = NextResponse.redirect(`${baseUrl}/admin`)

    response.cookies.set({
      name: "admin_session",
      value: sessionToken,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (e) {
    console.error("[Magic Link] Error:", e)
    return redirectWithError("Ошибка сервера")
  }
}

function redirectWithError(message: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://baltland.ru"
  return NextResponse.redirect(
    `${baseUrl}/admin/login?error=${encodeURIComponent(message)}`
  )
}
