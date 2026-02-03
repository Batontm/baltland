import { NextResponse, type NextRequest } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

const SECTION_ID = "00000000-0000-0000-0000-000000000002"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const supabase = createAdminClient()

  const [{ data: section, error: sectionError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("landing_benefits_section").select("*").eq("id", SECTION_ID).maybeSingle(),
    supabase.from("landing_benefit_items").select("*").eq("section_id", SECTION_ID).order("sort_order"),
  ])

  if (sectionError) return jsonError(sectionError.message, 500)
  if (itemsError) return jsonError(itemsError.message, 500)

  return NextResponse.json({ success: true, section, items: items || [] })
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return jsonError("Unauthorized", 401)

  const body = await request.json().catch(() => null)
  const section = body?.section as Record<string, unknown> | undefined
  const items = body?.items as Array<Record<string, unknown>> | undefined

  if (!section || !items) {
    return jsonError("section and items are required")
  }

  const supabase = createAdminClient()

  const { error: updateError } = await supabase
    .from("landing_benefits_section")
    .update({
      ...section,
      updated_at: new Date().toISOString(),
    })
    .eq("id", SECTION_ID)

  if (updateError) return jsonError(updateError.message, 500)

  const normalizedItems = items.map((it, idx) => {
    const id = typeof it.id === "string" && it.id ? it.id : crypto.randomUUID()
    return {
      id,
      section_id: SECTION_ID,
      title: (it.title as string) ?? "",
      description: (it.description as string) ?? "",
      icon_type: (it.icon_type as string) ?? "lucide",
      icon_name: (it.icon_name as string) ?? null,
      icon_url: (it.icon_url as string) ?? null,
      color_class: (it.color_class as string) ?? "bg-primary/10 text-primary",
      sort_order: typeof it.sort_order === "number" ? it.sort_order : idx + 1,
      is_active: typeof it.is_active === "boolean" ? it.is_active : true,
      updated_at: new Date().toISOString(),
    }
  })

  const { data: existing, error: existingError } = await supabase
    .from("landing_benefit_items")
    .select("id")
    .eq("section_id", SECTION_ID)

  if (existingError) return jsonError(existingError.message, 500)

  const keepIds = new Set(normalizedItems.map((i) => i.id))
  const toDelete = (existing || []).map((r) => r.id as string).filter((id) => !keepIds.has(id))

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from("landing_benefit_items").delete().in("id", toDelete)
    if (deleteError) return jsonError(deleteError.message, 500)
  }

  const { error: upsertError } = await supabase.from("landing_benefit_items").upsert(normalizedItems, { onConflict: "id" })
  if (upsertError) return jsonError(upsertError.message, 500)

  return NextResponse.json({ success: true, sectionId: SECTION_ID })
}
