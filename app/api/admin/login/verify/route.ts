import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import bcrypt from "bcryptjs"
import { createAdminSession } from "@/lib/admin-auth"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const otpToken = String(body?.otp_token || "").trim()
    const code = String(body?.code || "").trim()

    if (!otpToken || !code) {
      return jsonError("Введите код")
    }

    const supabase = createAdminClient()

    const { data: rows, error } = await supabase
      .from("admin_login_otps")
      .select("id, admin_user_id, otp_hash, expires_at, attempts, consumed_at")
      .eq("otp_token", otpToken)
      .limit(1)

    if (error) return jsonError("Ошибка сервера", 500)

    const row: any = rows?.[0]
    if (!row) return jsonError("Неверный или устаревший код", 401)

    if (row.consumed_at) return jsonError("Код уже использован", 401)

    const expiresAt = new Date(row.expires_at).getTime()
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return jsonError("Код истёк", 401)
    }

    const attempts = Number(row.attempts) || 0
    if (attempts >= 5) {
      return jsonError("Превышено количество попыток", 429)
    }

    const isValid = await bcrypt.compare(code, row.otp_hash)

    if (!isValid) {
      await supabase
        .from("admin_login_otps")
        .update({ attempts: attempts + 1 })
        .eq("id", row.id)
      return jsonError("Неверный код", 401)
    }

    const { data: users, error: userError } = await supabase
      .from("admin_users")
      .select("id, username")
      .eq("id", row.admin_user_id)
      .limit(1)

    if (userError || !users || users.length === 0) return jsonError("Пользователь не найден", 404)

    const user: any = users[0]

    await supabase
      .from("admin_login_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id)

    const sessionToken = await createAdminSession(user.id, user.username)

    const response = NextResponse.json({ success: true, redirect: "/admin" })

    const forwardedProto = request.headers.get("x-forwarded-proto")
    const proto = forwardedProto ?? request.nextUrl.protocol.replace(":", "")
    const isHttps = proto === "https"

    response.cookies.set({
      name: "admin_session",
      value: sessionToken,
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return response
  } catch (e) {
    return NextResponse.json({ success: false, error: "Ошибка сервера" }, { status: 500 })
  }
}
