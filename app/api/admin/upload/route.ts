import { NextResponse, type NextRequest } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

const BUCKET = "land-images"
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg", "image/png", "image/webp", "image/svg+xml", "application/pdf"
])

function jsonError(message: string, status = 400) {
    return NextResponse.json({ success: false, error: message }, { status })
}

function getExtensionFromFile(file: File) {
    const typeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/svg+xml": "svg",
        "application/pdf": "pdf",
    }

    const byType = typeToExt[file.type]
    if (byType) return byType

    const byName = file.name.includes(".") ? file.name.split(".").pop() : undefined
    return byName?.toLowerCase() || "bin"
}

export async function POST(request: NextRequest) {
    const session = await getAdminSession()
    if (!session) return jsonError("Unauthorized", 401)

    try {
        const formData = await request.formData()
        const file = formData.get("file")
        const type = formData.get("type") as string || "legal"

        if (!(file instanceof File)) {
            return jsonError("File is required")
        }

        const contentType = file.type || "application/octet-stream"
        if (!ALLOWED_MIME_TYPES.has(contentType)) {
            return jsonError("Unsupported file type")
        }

        const ext = getExtensionFromFile(file)
        const filename = `${crypto.randomUUID()}.${ext}`
        const storagePath = `${type}/${filename}`

        const supabase = createAdminClient()

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
            contentType,
            upsert: false,
        })

        if (uploadError) {
            return jsonError(uploadError.message, 500)
        }

        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

        return NextResponse.json({
            success: true,
            url: publicData.publicUrl,
            path: storagePath
        })
    } catch (error: any) {
        return jsonError(error.message, 500)
    }
}
