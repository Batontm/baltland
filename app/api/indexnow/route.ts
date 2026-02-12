import { NextRequest, NextResponse } from "next/server"

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "cd3025ff573285036fdf01b9c6584e38"
const BASE_URL = "https://baltland.ru"

export async function POST(request: NextRequest) {
    try {
        const { urls } = await request.json()

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: "urls array is required" }, { status: 400 })
        }

        const fullUrls = urls.map((url: string) =>
            url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`
        )

        const payload = {
            host: "baltland.ru",
            key: INDEXNOW_KEY,
            keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
            urlList: fullUrls,
        }

        const response = await fetch("https://yandex.com/indexnow", {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(payload),
        })

        return NextResponse.json({
            success: response.ok,
            status: response.status,
            submitted: fullUrls.length,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
