import { NextResponse, type NextRequest } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "land-images"
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function formatStorageErrorMessage(err: any) {
  const msg = String(err?.message || "")
  const status = err?.statusCode ?? err?.status
  if (msg.toLowerCase().includes("bucket") && msg.toLowerCase().includes("not found")) {
    return `Bucket not found: ${BUCKET}. Create it in Supabase Storage and set Public=true.`
  }
  if (status === 404) {
    return `Storage resource not found. Ensure bucket ${BUCKET} exists and is Public=true.`
  }
  return msg || "Storage error"
}

function getExtensionFromFile(file: File) {
  const typeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }

  const byType = typeToExt[file.type]
  if (byType) return byType

  const byName = file.name.includes(".") ? file.name.split(".").pop() : undefined
  if (byName && ["jpg", "jpeg", "png", "webp"].includes(byName.toLowerCase())) {
    return byName.toLowerCase() === "jpeg" ? "jpg" : byName.toLowerCase()
  }

  return "bin"
}

async function buildHtmlInsteadOfJsonDiagnostic() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let probe: { status?: number; contentType?: string; url?: string } | undefined
  if (supabaseUrl) {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 5000)
      try {
        const res = await fetch(new URL("/storage/v1/", supabaseUrl), {
          method: "GET",
          signal: controller.signal,
        })
        probe = {
          status: res.status,
          contentType: res.headers.get("content-type") || undefined,
          url: res.url,
        }
      } finally {
        clearTimeout(id)
      }
    } catch {
      // ignore probe failures
    }
  }

  return {
    success: false,
    error:
      "Supabase returned HTML instead of JSON. Check NEXT_PUBLIC_SUPABASE_URL: it must point to Supabase API gateway (Kong) of a full Supabase deployment (not just Postgres / not your website).",
    supabaseUrlHost: supabaseUrl
      ? (() => {
          try {
            return new URL(supabaseUrl).host
          } catch {
            return supabaseUrl
          }
        })()
      : undefined,
    storageProbe: probe,
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return jsonError("File is required")
    }

    const contentType = file.type || "application/octet-stream"
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return jsonError("Only jpeg/png/webp uploads are allowed")
    }

    const ext = getExtensionFromFile(file)
    const filename = `${crypto.randomUUID()}.${ext}`
    const storagePath = `news/${filename}`

    const supabase = createAdminClient()

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      contentType,
      upsert: false,
    })

    if (uploadError) {
      const uploadMessage = String(uploadError?.message || "")
      if (uploadMessage.includes("Unexpected token") && uploadMessage.includes("<")) {
        const diag = await buildHtmlInsteadOfJsonDiagnostic()
        return NextResponse.json(diag, { status: 500 })
      }
      return jsonError(formatStorageErrorMessage(uploadError), 500)
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    return NextResponse.json({ success: true, publicUrl: publicData.publicUrl, storagePath })
  } catch (error: any) {
    console.error("[admin/news/image] upload failed", error)
    const msg = String(error?.message || "")
    if (msg.includes("Unexpected token") && msg.includes("<")) {
      const diag = await buildHtmlInsteadOfJsonDiagnostic()
      return NextResponse.json(diag, { status: 500 })
    }
    return jsonError(msg || "Upload failed", 500)
  }
}
