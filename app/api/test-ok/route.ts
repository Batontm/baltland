import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const OK_API_BASE = "https://api.ok.ru/fb.do"

function getConfig() {
  return {
    appId: process.env.OK_APP_ID || "",
    appKey: process.env.OK_APP_PUBLIC_KEY || "",
    appSecret: process.env.OK_APP_SECRET || "",
    sessionSecret: process.env.OK_SESSION_SECRET_KEY || null,
    accessToken: process.env.OK_ACCESS_TOKEN || "",
    groupId: process.env.OK_GROUP_ID || null,
  }
}

function calcSig(
  params: Record<string, string>,
  sessionSecret: string
): string {
  const filtered = Object.keys(params)
    .filter((k) => k !== "access_token" && k !== "session_key")
    .sort()
  const sorted = filtered.map((k) => `${k}=${params[k]}`).join("")
  return crypto.createHash("md5").update(sorted + sessionSecret).digest("hex").toLowerCase()
}

async function callOkApi(
  method: string,
  extraParams: Record<string, string> = {},
  sigMode: "session_secret" | "md5_token_secret" = "session_secret"
) {
  const config = getConfig()
  const params: Record<string, string> = {
    method,
    application_key: config.appKey,
    format: "json",
    ...extraParams,
  }

  // Build sorted params string (exclude access_token and sig)
  const filtered = Object.keys(params)
    .filter((k) => k !== "access_token" && k !== "session_key" && k !== "sig")
    .sort()
  const sortedStr = filtered.map((k) => `${k}=${params[k]}`).join("")

  let secret: string
  if (sigMode === "session_secret") {
    secret = config.sessionSecret || ""
  } else {
    secret = crypto.createHash("md5").update(config.accessToken + config.appSecret).digest("hex").toLowerCase()
  }

  const sig = crypto.createHash("md5").update(sortedStr + secret).digest("hex").toLowerCase()
  params.sig = sig
  params.access_token = config.accessToken

  const url = new URL(OK_API_BASE)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString())
  const data = await res.json()
  return {
    method,
    sigMode,
    status: res.status,
    data,
    debug: {
      sortedParamsStr: sortedStr,
      secretUsed: secret.slice(0, 8) + "...",
      sig,
    },
  }
}

export async function GET(request: NextRequest) {
  const config = getConfig()

  const results: Record<string, unknown> = {
    env: {
      OK_APP_ID: config.appId ? `${config.appId.slice(0, 4)}...` : "NOT SET",
      OK_APP_PUBLIC_KEY: config.appKey ? `${config.appKey.slice(0, 6)}...` : "NOT SET",
      OK_APP_SECRET: config.appSecret ? "SET" : "NOT SET",
      OK_SESSION_SECRET_KEY: config.sessionSecret ? `${config.sessionSecret.slice(0, 8)}...` : "NOT SET",
      OK_ACCESS_TOKEN: config.accessToken ? `${config.accessToken.slice(0, 12)}...` : "NOT SET",
      OK_GROUP_ID: config.groupId || "NOT SET",
    },
  }

  // Test 1a: sig via session_secret_key (for eternal tokens)
  try {
    results.test1a_sessionSecret = await callOkApi("users.getCurrentUser", {}, "session_secret")
  } catch (e) {
    results.test1a_sessionSecret = { error: String(e) }
  }

  // Test 1b: sig via md5(access_token + app_secret) (classic method)
  try {
    results.test1b_md5Secret = await callOkApi("users.getCurrentUser", {}, "md5_token_secret")
  } catch (e) {
    results.test1b_md5Secret = { error: String(e) }
  }

  // Test 2: group.getInfo
  if (config.groupId) {
    try {
      results.test2_groupInfo = await callOkApi("group.getInfo", {
        uids: config.groupId,
        fields: "name,description,members_count",
      }, "session_secret")
    } catch (e) {
      results.test2_groupInfo = { error: String(e) }
    }
  }

  // Test 3: Post (only if ?post=true)
  const doPost = request.nextUrl.searchParams.get("post") === "true"
  if (doPost && config.groupId) {
    try {
      const attachment = JSON.stringify({
        media: [{ type: "text", text: "🧪 Тестовый пост от бота БалтикЗемля. Можно удалить." }],
      })
      results.test3_post = await callOkApi("mediatopic.post", {
        type: "GROUP_THEME",
        gid: config.groupId,
        attachment,
      }, "session_secret")
    } catch (e) {
      results.test3_post = { error: String(e) }
    }
  } else {
    results.test3_post = "Skipped. Add ?post=true to test posting."
  }

  return NextResponse.json(results, { status: 200 })
}
