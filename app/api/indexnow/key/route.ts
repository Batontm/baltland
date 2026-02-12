import { NextResponse } from "next/server"

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "cd3025ff573285036fdf01b9c6584e38"

export async function GET() {
    return new NextResponse(INDEXNOW_KEY, {
        headers: { "Content-Type": "text/plain" },
    })
}
