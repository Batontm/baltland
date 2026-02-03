import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enforceRateLimitOrThrow } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
    try {
        await enforceRateLimitOrThrow({ request, action: "public_submit", maxPerHour: 10 })

        const formData = await request.formData()
        const file = formData.get("file") as File | null
        const sessionId = formData.get("sessionId") as string | null

        if (!file || !sessionId) {
            return NextResponse.json({ success: false, error: "Некорректные данные" }, { status: 400 })
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ success: false, error: "Неподдерживаемый тип файла" }, { status: 400 })
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json({ success: false, error: "Файл слишком большой (макс. 10MB)" }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Ensure session exists
        await supabase
            .from("chat_sessions")
            .upsert({ id: sessionId, last_message_at: new Date().toISOString() }, { onConflict: "id" })

        // Upload file to storage
        const fileExt = file.name.split(".").pop()
        const fileName = `${sessionId}/${Date.now()}.${fileExt}`
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("chat-files")
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            })

        if (uploadError) {
            console.error("Upload error:", uploadError)
            return NextResponse.json({ success: false, error: "Ошибка загрузки файла" }, { status: 500 })
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(fileName)
        const fileUrl = urlData?.publicUrl

        // Create message with file
        const messageText = `📎 Файл: ${file.name}`
        const { data: message, error: messageError } = await supabase
            .from("chat_messages")
            .insert({
                session_id: sessionId,
                text: messageText,
                sender: "user",
                file_url: fileUrl,
                file_name: file.name,
            })
            .select()
            .single()

        if (messageError) {
            return NextResponse.json({ success: false, error: messageError.message }, { status: 500 })
        }

        // Send notification to Telegram
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        const adminChatId = process.env.ADMIN_CHAT_ID

        if (botToken && adminChatId && fileUrl) {
            try {
                const tgMsg = `📎 <b>Новый файл из чата</b>\n\nID сессии: <code>${sessionId.slice(0, 8)}</code>\nФайл: ${file.name}\n\n<a href="${fileUrl}">Скачать файл</a>\n\n<i>Ответьте на это сообщение в Telegram, чтобы отправить ответ пользователю.</i>`

                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: adminChatId,
                        text: tgMsg,
                        parse_mode: "HTML",
                    }),
                })
            } catch {
                // Ignore telegram errors
            }
        }

        return NextResponse.json({ success: true, message })
    } catch (e: any) {
        if (e?.code === "RATE_LIMIT") {
            return NextResponse.json(
                { success: false, error: "Слишком много запросов. Попробуйте позже." },
                { status: 429 },
            )
        }
        console.error("Chat upload error:", e)
        return NextResponse.json({ success: false, error: "Ошибка сервера" }, { status: 500 })
    }
}
