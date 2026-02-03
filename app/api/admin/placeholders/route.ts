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

export async function GET() {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const supabase = createAdminClient()

  const { data, error } = await supabase.from("plot_placeholders").select("*").order("created_at", { ascending: false })

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ success: true, placeholders: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

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
  const storagePath = `placeholders/${filename}`

  const supabase = createAdminClient()

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType,
    upsert: false,
  })

  if (uploadError) return jsonError(formatStorageErrorMessage(uploadError), 500)

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = publicData.publicUrl

  const { data: inserted, error: insertError } = await supabase
    .from("plot_placeholders")
    .insert({ storage_path: storagePath, public_url: publicUrl })
    .select("*")
    .single()

  if (insertError) return jsonError(insertError.message, 500)
  return NextResponse.json({ success: true, placeholder: inserted })
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const body = await request.json().catch(() => null)
  const placeholderId = body?.placeholderId as string | undefined

  if (!placeholderId) return jsonError("placeholderId is required")

  const supabase = createAdminClient()

  const { data: placeholder, error: fetchError } = await supabase
    .from("plot_placeholders")
    .select("*")
    .eq("id", placeholderId)
    .single()

  if (fetchError || !placeholder) return jsonError(fetchError?.message || "Not found", 404)

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([placeholder.storage_path])
  if (storageError) return jsonError(storageError.message, 500)

  const { error: deleteError } = await supabase.from("plot_placeholders").delete().eq("id", placeholderId)
  if (deleteError) return jsonError(deleteError.message, 500)

  return NextResponse.json({ success: true })
}
