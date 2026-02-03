import { NextResponse, type NextRequest } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "land-images"
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
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

async function syncCoverForPlot(supabase: ReturnType<typeof createAdminClient>, plotId: string) {
  const { data: first } = await supabase
    .from("land_plot_images")
    .select("id, public_url")
    .eq("plot_id", plotId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const firstId = (first as any)?.id as string | undefined
  const firstUrl = (first as any)?.public_url as string | undefined

  if (!firstId || !firstUrl) {
    await supabase.from("land_plots").update({ image_url: null }).eq("id", plotId)
    return
  }

  await supabase.from("land_plot_images").update({ is_cover: false }).eq("plot_id", plotId).eq("is_cover", true)
  await supabase.from("land_plot_images").update({ is_cover: true }).eq("id", firstId).eq("plot_id", plotId)
  await supabase.from("land_plots").update({ image_url: firstUrl }).eq("id", plotId)
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ plotId: string }> }) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const { plotId } = await params

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("land_plot_images")
    .select("*")
    .eq("plot_id", plotId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ success: true, images: data || [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ plotId: string }> }) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const { plotId } = await params

  const formData = await request.formData()
  const file = formData.get("file")
  const makeCover = formData.get("makeCover") === "true"

  if (!(file instanceof File)) {
    return jsonError("File is required")
  }

  const contentType = file.type || "application/octet-stream"
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return jsonError("Only jpeg/png/webp uploads are allowed")
  }

  const ext = getExtensionFromFile(file)
  const filename = `${crypto.randomUUID()}.${ext}`
  const storagePath = `plots/${plotId}/${filename}`

  const supabase = createAdminClient()

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType,
    upsert: false,
  })

  if (uploadError) return jsonError(uploadError.message, 500)

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = publicData.publicUrl

  const { data: coverExists } = await supabase
    .from("land_plot_images")
    .select("id")
    .eq("plot_id", plotId)
    .eq("is_cover", true)
    .limit(1)

  const shouldMakeCover = makeCover || !coverExists || coverExists.length === 0

  const { data: maxSort } = await supabase
    .from("land_plot_images")
    .select("sort_order")
    .eq("plot_id", plotId)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const nextSortOrderRaw = (maxSort as any)?.sort_order
  const nextSortOrder = typeof nextSortOrderRaw === "number" ? nextSortOrderRaw + 1 : 0

  if (shouldMakeCover) {
    const { error: clearError } = await supabase
      .from("land_plot_images")
      .update({ is_cover: false })
      .eq("plot_id", plotId)
      .eq("is_cover", true)

    if (clearError) return jsonError(clearError.message, 500)
  }

  const { data: inserted, error: insertError } = await supabase
    .from("land_plot_images")
    .insert({
      plot_id: plotId,
      storage_path: storagePath,
      public_url: publicUrl,
      is_cover: shouldMakeCover,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single()

  if (insertError) return jsonError(insertError.message, 500)

  if (shouldMakeCover) {
    const { error: coverError } = await supabase.from("land_plots").update({ image_url: publicUrl }).eq("id", plotId)
    if (coverError) return jsonError(coverError.message, 500)
  }

  return NextResponse.json({ success: true, image: inserted })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ plotId: string }> }) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const { plotId } = await params

  const body = await request.json().catch(() => null)
  const imageId = body?.imageId as string | undefined

  if (!imageId) return jsonError("imageId is required")

  const supabase = createAdminClient()

  const { data: image, error: fetchError } = await supabase
    .from("land_plot_images")
    .select("*")
    .eq("id", imageId)
    .eq("plot_id", plotId)
    .single()

  if (fetchError || !image) return jsonError(fetchError?.message || "Not found", 404)

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([image.storage_path])
  if (storageError) return jsonError(storageError.message, 500)

  const { error: deleteError } = await supabase.from("land_plot_images").delete().eq("id", imageId).eq("plot_id", plotId)
  if (deleteError) return jsonError(deleteError.message, 500)

  if (image.is_cover) {
    await syncCoverForPlot(supabase, plotId)
  }

  return NextResponse.json({ success: true })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ plotId: string }> }) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const { plotId } = await params

  const body = await request.json().catch(() => null)
  const imageId = body?.imageId as string | undefined
  if (!imageId) return jsonError("imageId is required")

  const supabase = createAdminClient()

  const { data: image, error: fetchError } = await supabase
    .from("land_plot_images")
    .select("*")
    .eq("id", imageId)
    .eq("plot_id", plotId)
    .single()

  if (fetchError || !image) return jsonError(fetchError?.message || "Not found", 404)

  const { error: clearError } = await supabase
    .from("land_plot_images")
    .update({ is_cover: false })
    .eq("plot_id", plotId)
    .eq("is_cover", true)

  if (clearError) return jsonError(clearError.message, 500)

  const { error: setError } = await supabase
    .from("land_plot_images")
    .update({ is_cover: true })
    .eq("id", imageId)
    .eq("plot_id", plotId)

  if (setError) return jsonError(setError.message, 500)

  const { error: plotError } = await supabase.from("land_plots").update({ image_url: image.public_url }).eq("id", plotId)
  if (plotError) return jsonError(plotError.message, 500)

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ plotId: string }> }) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const { plotId } = await params

  const body = await request.json().catch(() => null)
  const orderedIds = (body?.orderedIds as string[] | undefined) || []

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return jsonError("orderedIds is required")
  }

  const supabase = createAdminClient()

  const { data: existing, error: existingError } = await supabase
    .from("land_plot_images")
    .select("id")
    .eq("plot_id", plotId)

  if (existingError) return jsonError(existingError.message, 500)

  const existingIds = new Set((existing || []).map((r: any) => r.id))
  const filtered = orderedIds.filter((id) => existingIds.has(id))
  if (filtered.length === 0) return jsonError("No valid image ids")

  for (let i = 0; i < filtered.length; i++) {
    const imageId = filtered[i]
    const { error } = await supabase
      .from("land_plot_images")
      .update({ sort_order: i } as any)
      .eq("id", imageId)
      .eq("plot_id", plotId)
    if (error) return jsonError(error.message, 500)
  }

  await syncCoverForPlot(supabase, plotId)
  return NextResponse.json({ success: true })
}
