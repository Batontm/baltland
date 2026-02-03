import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production")

export interface AdminSession {
  userId: string
  username: string
  expiresAt: number
}

export async function createAdminSession(userId: string, username: string): Promise<string> {
  const token = await new SignJWT({ userId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)

  return token
}

export async function verifyAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    return {
      userId: payload.userId as string,
      username: payload.username as string,
      expiresAt: (payload.exp || 0) * 1000,
    }
  } catch (error) {
    return null
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value

  if (!token) {
    return null
  }

  return verifyAdminSession(token)
}

export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies()

  const forwardedProto = cookieStore.get("x-forwarded-proto")?.value
  const isHttps = forwardedProto === "https"

  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV !== "production" ? isHttps : true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")
}
