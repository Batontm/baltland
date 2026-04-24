import { NextRequest, NextResponse } from "next/server"

const OK_APP_ID = "512004487254"
const OK_APP_SECRET = "E1C7692C7AA30A2CC7EAF624"
const REDIRECT_URI = "https://baltland.ru/api/ok-callback"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")

  // If no code — show the link to start OAuth
  if (!code) {
    const authUrl = `https://connect.ok.ru/oauth/authorize?client_id=${OK_APP_ID}&scope=VALUABLE_ACCESS;LONG_ACCESS_TOKEN;PHOTO_CONTENT;GROUP_CONTENT&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>OK OAuth</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px}
a{display:inline-block;padding:12px 24px;background:#f90;color:#fff;text-decoration:none;border-radius:8px;font-size:16px}
a:hover{background:#e80}
.error{color:red;padding:12px;background:#fee;border-radius:8px}</style></head>
<body>
<h1>🔑 OK API — Авторизация</h1>
${error ? `<div class="error">Ошибка: ${error}</div>` : ""}
<p>Нажмите кнопку ниже, чтобы авторизовать приложение и получить access_token:</p>
<a href="${authUrl}">Авторизовать в Одноклассниках</a>
<p style="margin-top:20px;color:#666;font-size:13px">App ID: ${OK_APP_ID}<br>Redirect: ${REDIRECT_URI}<br>Scopes: VALUABLE_ACCESS, LONG_ACCESS_TOKEN, PHOTO_CONTENT, GROUP_CONTENT</p>
</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  }

  // Exchange code for token
  try {
    const tokenResponse = await fetch("https://api.ok.ru/oauth/token.do", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: OK_APP_ID,
        client_secret: OK_APP_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })

    const data = await tokenResponse.json()

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>OK OAuth — Результат</title>
<style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px}
pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto;font-size:14px}
.token{background:#efe;padding:12px;border-radius:8px;word-break:break-all;font-family:monospace;font-size:13px}
.error{background:#fee;padding:12px;border-radius:8px}
.label{font-weight:bold;margin-top:16px;margin-bottom:4px}</style></head>
<body>
<h1>🔑 OK API — Результат авторизации</h1>
${data.error ? `<div class="error">❌ Ошибка: ${data.error} — ${data.error_description || ""}</div>` : ""}
${data.access_token ? `
<p>✅ Токен получен успешно!</p>
<div class="label">access_token:</div>
<div class="token">${data.access_token}</div>
${data.session_secret_key ? `<div class="label">session_secret_key:</div><div class="token">${data.session_secret_key}</div>` : ""}
${data.refresh_token ? `<div class="label">refresh_token:</div><div class="token">${data.refresh_token}</div>` : ""}
${data.expires_in ? `<div class="label">expires_in:</div><div class="token">${data.expires_in} сек</div>` : ""}
<p style="margin-top:20px;color:#666">⚠️ Скопируйте эти значения и передайте разработчику для обновления на сервере. Не публикуйте их.</p>
` : ""}
<div class="label">Полный ответ API:</div>
<pre>${JSON.stringify(data, null, 2)}</pre>
</body></html>`

    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
  } catch (err) {
    return NextResponse.json({ error: "Token exchange failed", details: String(err) }, { status: 500 })
  }
}
