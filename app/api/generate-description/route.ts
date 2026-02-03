import { NextRequest, NextResponse } from "next/server"

const PERPLEXITY_API_URL = process.env.PERPLEXITY_API_URL || "https://api.perplexity.ai/chat/completions"
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

export async function POST(request: NextRequest) {
    try {
        if (!PERPLEXITY_API_KEY) {
            return NextResponse.json(
                { error: "Perplexity API key not configured" },
                { status: 500 }
            )
        }

        const { prompt, settlementName, districtName } = await request.json()

        if (!settlementName || !districtName) {
            return NextResponse.json(
                { error: "Settlement and district names are required" },
                { status: 400 }
            )
        }

        const systemPrompt = prompt || `Ты — эксперт по недвижимости в Калининградской области. 
Напиши привлекательное описание для земельного участка в указанном посёлке.
Описание должно включать:
- Эмодзи для визуального оформления
- Расположение и расстояние до Калининграда
- Транспортную доступность
- Коммуникации (электричество, газ, вода)
- Природу и экологию
- Преимущества покупки

Формат ответа — только текст описания, без дополнительных комментариев.
Пиши на русском языке. Используй реальные данные о посёлке если знаешь их.`

        const userMessage = `Напиши описание для посёлка "${settlementName}" в ${districtName}, Калининградская область.`

        const response = await fetch(PERPLEXITY_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "sonar",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                temperature: 0.7,
                max_tokens: 1500,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("[Perplexity API] Error:", errorText)
            return NextResponse.json(
                { error: `Perplexity API error: ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        const generatedText = data.choices?.[0]?.message?.content || ""

        return NextResponse.json({ description: generatedText })
    } catch (error) {
        console.error("[Perplexity API] Error:", error)
        return NextResponse.json(
            { error: String(error) },
            { status: 500 }
        )
    }
}
