/**
 * VK API Client for publishing land plots
 */

import { buildPlotSeoPath, buildPlotSlug } from "@/lib/utils"

const VK_API_BASE = "https://api.vk.com/method"

interface VKApiConfig {
    accessToken: string
    groupId: string
    apiVersion: string
}

interface VKUploadServer {
    upload_url: string
}

interface VKPhotoUploadResponse {
    server: number
    photo: string
    hash: string
}

interface VKWallPhotoSaveResponse {
    id: number
    owner_id: number
}

interface VKWallPostResponse {
    post_id: number
}

interface VKApiError {
    error_code: number
    error_msg: string
}

interface VKApiResponse<T> {
    response?: T
    error?: VKApiError
}

function getConfig(): VKApiConfig {
    const accessToken = process.env.VK_ACCESS_TOKEN
    const groupId = process.env.VK_GROUP_ID
    const apiVersion = process.env.VK_API_VERSION || "5.131"

    if (!accessToken) throw new Error("VK_ACCESS_TOKEN is not set")
    if (!groupId) throw new Error("VK_GROUP_ID is not set")

    return { accessToken, groupId, apiVersion }
}

/**
 * Make a VK API request
 */
async function vkRequest<T>(
    method: string,
    params: Record<string, string | number | boolean>
): Promise<T> {
    const config = getConfig()

    const url = new URL(`${VK_API_BASE}/${method}`)
    url.searchParams.set("access_token", config.accessToken)
    url.searchParams.set("v", config.apiVersion)

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value))
    }

    const response = await fetch(url.toString())
    const data: VKApiResponse<T> = await response.json()

    if (data.error) {
        throw new Error(`VK API Error ${data.error.error_code}: ${data.error.error_msg}`)
    }

    if (!data.response) {
        throw new Error("VK API returned empty response")
    }

    return data.response
}

/**
 * Upload a photo to VK wall
 * Note: With user token, we upload to user's wall (no group_id), 
 * then the photo can be attached to group posts
 */
export async function uploadPhotoToWall(imageUrl: string): Promise<string> {
    console.log("VK uploadPhotoToWall: Starting upload for", imageUrl)

    // 1. Get upload server (no group_id - upload to user's wall with user token)
    const uploadServer = await vkRequest<VKUploadServer>("photos.getWallUploadServer", {})
    console.log("VK uploadPhotoToWall: Got upload server:", uploadServer.upload_url)

    // 2. Download image from URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }
    const imageBuffer = await imageResponse.arrayBuffer()
    console.log("VK uploadPhotoToWall: Downloaded image, size:", imageBuffer.byteLength)

    // 3. Upload to VK server
    const formData = new FormData()
    formData.append("photo", new Blob([imageBuffer], { type: "image/jpeg" }), "photo.jpg")

    const uploadResponse = await fetch(uploadServer.upload_url, {
        method: "POST",
        body: formData,
    })
    const uploadResult: VKPhotoUploadResponse = await uploadResponse.json()
    console.log("VK uploadPhotoToWall: Upload result:", JSON.stringify(uploadResult))

    if (!uploadResult.photo || uploadResult.photo === "[]") {
        throw new Error("Failed to upload photo to VK")
    }

    // 4. Save photo to user's wall (no group_id)
    const savedPhotos = await vkRequest<VKWallPhotoSaveResponse[]>("photos.saveWallPhoto", {
        photo: uploadResult.photo,
        server: uploadResult.server,
        hash: uploadResult.hash,
    })
    console.log("VK uploadPhotoToWall: Saved photo:", savedPhotos[0]?.id, "owner:", savedPhotos[0]?.owner_id)

    if (!savedPhotos.length) {
        throw new Error("Failed to save photo to VK wall")
    }

    // Return attachment string
    return `photo${savedPhotos[0].owner_id}_${savedPhotos[0].id}`
}

/**
 * Post to VK group wall
 */
export async function postToWall(params: {
    message: string
    attachments?: string[]
    publishDate?: number // Unix timestamp for delayed post
}): Promise<{ postId: number; url: string }> {
    const config = getConfig()
    const groupId = config.groupId

    const requestParams: Record<string, string | number | boolean> = {
        owner_id: `-${groupId}`, // Negative ID for group
        from_group: 1,
        message: params.message,
    }

    if (params.attachments?.length) {
        requestParams.attachments = params.attachments.join(",")
    }

    if (params.publishDate) {
        requestParams.publish_date = params.publishDate
    }

    const result = await vkRequest<VKWallPostResponse>("wall.post", requestParams)

    return {
        postId: result.post_id,
        url: `https://vk.com/wall-${groupId}_${result.post_id}`,
    }
}

/**
 * Delete a wall post
 */
export async function deleteWallPost(postId: number): Promise<boolean> {
    const config = getConfig()

    await vkRequest<number>("wall.delete", {
        owner_id: `-${config.groupId}`,
        post_id: postId,
    })

    return true
}

/**
 * Format plot data for VK post
 */
export function formatPlotPost(plot: {
    title?: string
    cadastral_number?: string
    area_sotok?: number
    price?: number
    location?: string
    district?: string
    has_gas?: boolean
    has_electricity?: boolean
    has_water?: boolean
    id: string
    int_id?: number
}): string {
    const location = plot.location || plot.district || ""
    // Construct specific title for VK: "Участок [площадь] сот. [поселок]"
    const title = `Участок ${plot.area_sotok || 0} сот. ${location}`.trim()

    // Format price
    const price = plot.price
        ? new Intl.NumberFormat("ru-RU").format(plot.price)
        : "Договорная"

    // Utilities
    const utilities: string[] = []
    if (plot.has_gas) utilities.push("🔥 Газ")
    if (plot.has_electricity) utilities.push("⚡ Свет")
    if (plot.has_water) utilities.push("💧 Вода")

    // Hashtags
    const hashtags = ["#земля", "#участок", "#калининград"]
    if (location) {
        // Sanitize location for hashtag
        const locationTag = location
            .toLowerCase()
            .replace(/пос\.|п\.|\s+/g, "")
            .replace(/[^а-яёa-z0-9]/gi, "")
        if (locationTag) hashtags.push(`#${locationTag}`)
    }

    // Build URL
    const url = `https://baltland.ru${buildPlotSeoPath({
        district: (plot as any).district,
        location: (plot as any).location,
        intId: (plot as any).int_id || plot.id,
    })}`

    // Build message
    const lines = [
        `🏡 ${title}`,
        "",
        plot.cadastral_number ? `📍 Кадастровый номер: ${plot.cadastral_number}` : "",
        `📐 Площадь: ${plot.area_sotok || 0} соток`,
        `💰 Цена: ${price} ₽`,
        "",
        utilities.length ? utilities.join(" | ") : "",
        "",
        `🔗 Подробнее: ${url}`,
        "",
        hashtags.join(" "),
    ]

    return lines.filter(Boolean).join("\n")
}

/**
 * Publish a plot to VK
 */
export async function publishPlotToVK(plot: {
    id: string
    title?: string
    cadastral_number?: string
    area_sotok?: number
    price?: number
    location?: string
    district?: string
    has_gas?: boolean
    has_electricity?: boolean
    has_water?: boolean
    image_url?: string
}): Promise<{ postId: number; url: string }> {
    const message = formatPlotPost(plot)

    let attachments: string[] = []

    // Upload map image if available
    if (plot.image_url) {
        try {
            const photoAttachment = await uploadPhotoToWall(plot.image_url)
            attachments.push(photoAttachment)
        } catch (error) {
            console.error("Failed to upload photo to VK:", error)
            // Continue without photo
        }
    }

    return postToWall({ message, attachments })
}

/**
 * Rate limiter for VK API (3 requests per second)
 */
export class VKRateLimiter {
    private lastRequest: number = 0
    private readonly minInterval: number = 334 // ~3 requests per second

    async wait(): Promise<void> {
        const now = Date.now()
        const elapsed = now - this.lastRequest
        const waitTime = Math.max(0, this.minInterval - elapsed)

        if (waitTime > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitTime))
        }

        this.lastRequest = Date.now()
    }
}
