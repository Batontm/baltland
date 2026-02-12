const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "cd3025ff573285036fdf01b9c6584e38"
const BASE_URL = "https://baltland.ru"

/**
 * Submit URLs to IndexNow (Yandex) for fast indexing.
 * Can be called from server actions after creating/updating content.
 */
export async function submitToIndexNow(urls: string[]): Promise<boolean> {
    if (!urls.length) return false

    const fullUrls = urls.map((url) =>
        url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`
    )

    try {
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

        if (!response.ok) {
            console.warn(`[IndexNow] Failed: ${response.status} ${response.statusText}`)
            return false
        }

        console.log(`[IndexNow] Submitted ${fullUrls.length} URLs`)
        return true
    } catch (error) {
        console.warn("[IndexNow] Error:", error)
        return false
    }
}
