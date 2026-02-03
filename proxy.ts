import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"

// Функция для проверки валидности URL (защита от некорректно закодированных запросов)
function isValidPath(pathname: string): boolean {
  try {
    // Всегда разрешаем корневой путь и статические файлы
    if (
      pathname === "/" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/)
    ) {
      return true
    }

    // Декодируем URL для проверки (только если есть закодированные символы)
    let decoded = pathname
    if (pathname.includes("%")) {
      try {
        decoded = decodeURIComponent(pathname)
      } catch {
        // Если декодирование не удалось, это некорректный URL
        return false
      }
    }

    // Проверяем на наличие непечатаемых символов (мусорные символы)
    if (/[\x00-\x1F\x7F-\x9F]/.test(decoded)) {
      return false
    }

    // Проверяем на наличие подозрительных паттернов (множественные кодирования)
    // Только если в пути много закодированных символов
    if (pathname.includes("%")) {
      const encodedMatches = pathname.match(/%[0-9A-F]{2}/gi)
      if (encodedMatches && encodedMatches.length > 10) {
        // Если слишком много URL-encoded символов, это подозрительно
        return false
      }
    }

    return true
  } catch {
    // Если что-то пошло не так, разрешаем (лучше пропустить, чем заблокировать легитимный запрос)
    return true
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Фильтрация некорректных URL (защита от ботов и сканеров)
  if (!isValidPath(pathname)) {
    // Возвращаем 400 Bad Request для некорректных URL вместо 404
    return new NextResponse("Bad Request", { status: 400 })
  }

  // Обработка админ-панели
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || pathname === "/admin/fix-password") {
      return NextResponse.next()
    }

    const adminSessionToken = request.cookies.get("admin_session")?.value

    if (!adminSessionToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    const session = await verifyAdminSession(adminSessionToken)

    if (!session || Date.now() > session.expiresAt) {
      const response = NextResponse.redirect(new URL("/admin/login", request.url))
      response.cookies.delete("admin_session")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
