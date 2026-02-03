import { NextResponse, type NextRequest } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

type ImportItem = {
  district: string
  settlement: string
  description: string
  has_gas?: boolean
  has_electricity?: boolean
  has_water?: boolean
  has_installment?: boolean
  is_featured?: boolean
}

type ImportPayload = {
  items: ImportItem[]
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

    const raw = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return jsonError("Invalid JSON")
    }

    const payload = parsed as Partial<ImportPayload>
    const items = Array.isArray(payload.items) ? payload.items : null
    if (!items) return jsonError("JSON must be an object with 'items' array")

    const normalized = items
      .map((it) => ({
        district: String((it as any).district || "").trim(),
        settlement: String((it as any).settlement || "").trim(),
        description: String((it as any).description || "").trim(),
        has_gas: Boolean((it as any).has_gas),
        has_electricity: Boolean((it as any).has_electricity),
        has_water: Boolean((it as any).has_water),
        has_installment: Boolean((it as any).has_installment),
        is_featured: Boolean((it as any).is_featured),
      }))
      .filter((it) => {
        if (!it.district || !it.settlement) return false
        const hasAnyFlag =
          it.has_gas || it.has_electricity || it.has_water || it.has_installment || it.is_featured
        return Boolean(it.description) || hasAnyFlag
      })

    if (normalized.length === 0) {
      return jsonError(
        "No valid items found. Each item must have district, settlement, and at least description or one of flags (has_gas/has_electricity/has_water/has_installment/is_featured)",
      )
    }

    const supabase = createAdminClient()

    const rows = normalized.map((it) => ({
      district_name: it.district,
      settlement_name: it.settlement,
      description: it.description || "",
      has_gas: it.has_gas,
      has_electricity: it.has_electricity,
      has_water: it.has_water,
      has_installment: it.has_installment,
      is_featured: it.is_featured,
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from("settlement_descriptions")
      .upsert(rows, { onConflict: "district_name,settlement_name" })
      .select("id")

    if (error) return jsonError(error.message, 500)

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      total: normalized.length,
    })
  } catch (e: any) {
    return jsonError(e?.message || String(e), 500)
  }
}
