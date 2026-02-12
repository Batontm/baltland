/**
 * OK (Odnoklassniki) API Client for publishing land plots
 * 
 * OK API Documentation: https://apiok.ru/dev/methods/rest/mediatopic/mediatopic.post
 */

import { buildPlotSeoPath } from "@/lib/utils"
import crypto from "crypto"

const OK_API_BASE = "https://api.ok.ru/fb.do"

interface OKApiConfig {
    applicationId: string
    applicationKey: string
    applicationSecretKey: string
    sessionSecretKey: string | null
    accessToken: string
    groupId: string | null
}

interface OKApiResponse<T> {
    error_code?: number
    error_msg?: string
    error_data?: string
    [key: string]: T | number | string | undefined
}

interface OKPhotoUploadInfo {
    photo_ids: string[]
}

interface OKMediaTopicResponse {
    id?: string
}

/**
 * Get OK API configuration from environment variables
 */
function getConfig(): OKApiConfig {
    const applicationId = process.env.OK_APP_ID
    const applicationKey = process.env.OK_APP_PUBLIC_KEY || process.env.OK_APP_ID || ""
    const applicationSecretKey = process.env.OK_APP_SECRET
    const sessionSecretKey = process.env.OK_SESSION_SECRET_KEY || null
    const accessToken = process.env.OK_ACCESS_TOKEN
    const groupId = process.env.OK_GROUP_ID || null

    if (!applicationId) throw new Error("OK_APP_ID is not set")
    if (!applicationSecretKey) throw new Error("OK_APP_SECRET is not set")
    if (!accessToken) throw new Error("OK_ACCESS_TOKEN is not set")

    return { applicationId, applicationKey, applicationSecretKey, sessionSecretKey, accessToken, groupId }
}

/**
 * Calculate OK API signature
 * sig = md5(params_sorted_by_name + md5(access_token + application_secret_key))
 */
function calculateSignature(
    params: Record<string, string>,
    accessToken: string,
    secretKey: string,
    sessionSecretKey: string | null
): string {
    // Per OK API docs: remove access_token/session_key from params before sig calculation
    const filteredKeys = Object.keys(params)
        .filter(key => key !== "access_token" && key !== "session_key")
        .sort()
    const sortedParams = filteredKeys
        .map(key => `${key}=${params[key]}`)
        .join("")

    // If session_secret_key is available (eternal token), use it directly
    // Otherwise for session call: md5(access_token + application_secret_key)
    const secret = sessionSecretKey
        ? sessionSecretKey
        : crypto
            .createHash("md5")
            .update(accessToken + secretKey)
            .digest("hex")
            .toLowerCase()

    // sig = md5(sorted_params + session_secret_key)
    const sig = crypto
        .createHash("md5")
        .update(sortedParams + secret)
        .digest("hex")
        .toLowerCase()

    return sig
}

/**
 * Make an OK API request
 */
async function okRequest<T>(
    method: string,
    params: Record<string, string | number | boolean> = {}
): Promise<T> {
    const config = getConfig()

    // Build params
    const requestParams: Record<string, string> = {
        method,
        application_key: config.applicationKey,
        format: "json",
    }

    // Add custom params
    for (const [key, value] of Object.entries(params)) {
        requestParams[key] = String(value)
    }

    // Calculate signature
    const sig = calculateSignature(requestParams, config.accessToken, config.applicationSecretKey, config.sessionSecretKey)
    requestParams.sig = sig
    requestParams.access_token = config.accessToken

    // Build URL
    const url = new URL(OK_API_BASE)
    for (const [key, value] of Object.entries(requestParams)) {
        url.searchParams.set(key, value)
    }

    console.log(`[OK API] Calling ${method}, app_key=${config.applicationKey}, app_id=${config.applicationId}, has_session_secret=${!!config.sessionSecretKey}, has_access_token=${!!config.accessToken}, sig=${sig}`)

    const response = await fetch(url.toString())
    const data: OKApiResponse<T> = await response.json()

    if (data.error_code) {
        throw new Error(`OK API Error ${data.error_code}: ${data.error_msg || data.error_data}`)
    }

    return data as T
}

/**
 * Upload photo to OK (group or profile)
 * Returns photo token for use in mediatopic.post
 */
export async function uploadPhotoToGroup(imageUrl: string): Promise<string> {
    const config = getConfig()

    console.log("[OK API] uploadPhoto: Starting upload for", imageUrl)

    // 1. Get upload URL (with gid for group, without for profile)
    const uploadParams: Record<string, string | number | boolean> = { count: 1 }
    if (config.groupId) {
        uploadParams.gid = config.groupId
    }
    const uploadInfo = await okRequest<{ upload_url: string; photo_ids: string[] }>(
        "photosV2.getUploadUrl",
        uploadParams
    )

    console.log("[OK API] Got upload URL:", uploadInfo.upload_url)

    // 2. Download image from source URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }
    const imageBuffer = await imageResponse.arrayBuffer()
    console.log("[OK API] Downloaded image, size:", imageBuffer.byteLength)

    // 3. Upload to OK server
    const formData = new FormData()
    formData.append("photo", new Blob([imageBuffer], { type: "image/jpeg" }), "photo.jpg")

    const uploadResponse = await fetch(uploadInfo.upload_url, {
        method: "POST",
        body: formData,
    })
    const uploadResult = await uploadResponse.json()
    console.log("[OK API] Upload result:", JSON.stringify(uploadResult))

    if (!uploadResult.photos || Object.keys(uploadResult.photos).length === 0) {
        throw new Error("Failed to upload photo to OK")
    }

    // 4. Commit the photo
    const photoToken = Object.values(uploadResult.photos)[0] as { token: string }

    const commitResult = await okRequest<{ photos: Record<string, { id: string }> }>(
        "photosV2.commit",
        {
            photo_id: uploadInfo.photo_ids[0],
            token: photoToken.token,
        }
    )

    const photoId = Object.values(commitResult.photos)[0]?.id
    if (!photoId) {
        throw new Error("Failed to commit photo to OK")
    }

    console.log("[OK API] Photo committed, ID:", photoId)
    return photoId
}

/**
 * Post mediatopic to OK group or user profile
 */
export async function postToGroup(params: {
    text: string
    photoIds?: string[]
    linkUrl?: string
}): Promise<{ topicId: string; url: string }> {
    const config = getConfig()

    // Build media array
    const media: Array<{ type: string;[key: string]: unknown }> = []

    // Add text
    media.push({
        type: "text",
        text: params.text,
    })

    // Add photos if available
    if (params.photoIds && params.photoIds.length > 0) {
        media.push({
            type: "photo",
            list: params.photoIds.map(id => ({ photoId: id })),
        })
    }

    // Add link if available
    if (params.linkUrl) {
        media.push({
            type: "link",
            url: params.linkUrl,
        })
    }

    // Create attachment JSON
    const attachment = JSON.stringify({ media })

    const isGroup = !!config.groupId
    console.log(`[OK API] postTo${isGroup ? 'Group' : 'Profile'}: attachment =`, attachment)

    // Call mediatopic.post — GROUP_THEME for group, USER_THEME for profile
    const postParams: Record<string, string | number | boolean> = {
        type: isGroup ? "GROUP_THEME" : "USER_THEME",
        attachment,
    }
    if (isGroup) {
        postParams.gid = config.groupId!
    }

    const result = await okRequest<OKMediaTopicResponse>("mediatopic.post", postParams)

    if (!result.id) {
        throw new Error("Failed to create mediatopic: no ID returned")
    }

    const url = isGroup
        ? `https://ok.ru/group/${config.groupId}/topic/${result.id}`
        : `https://ok.ru/profile/topic/${result.id}`

    return { topicId: result.id, url }
}

/**
 * Delete a topic (group or profile)
 */
export async function deleteGroupTopic(topicId: string): Promise<boolean> {
    const config = getConfig()

    try {
        const deleteParams: Record<string, string | number | boolean> = {
            topic_id: topicId,
        }
        if (config.groupId) {
            deleteParams.gid = config.groupId
        }
        await okRequest("mediatopic.delete", deleteParams)
        return true
    } catch (error) {
        console.error("[OK API] Failed to delete topic:", error)
        return false
    }
}

/**
 * Format plot data for OK post
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
}): { text: string; linkUrl: string } {
    const location = plot.location || plot.district || ""
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
    const hashtags = ["#земля", "#участок", "#калининград", "#одноклассники"]
    if (location) {
        const locationTag = location
            .toLowerCase()
            .replace(/пос\.|п\.|\s+/g, "")
            .replace(/[^а-яёa-z0-9]/gi, "")
        if (locationTag) hashtags.push(`#${locationTag}`)
    }

    // Build URL
    const linkUrl = `https://baltland.ru${buildPlotSeoPath({
        district: (plot as Record<string, unknown>).district as string,
        location: (plot as Record<string, unknown>).location as string,
        intId: (plot as Record<string, unknown>).int_id as number || plot.id,
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
        `🔗 Подробнее на сайте`,
        "",
        hashtags.join(" "),
    ]

    return {
        text: lines.filter(Boolean).join("\n"),
        linkUrl,
    }
}

/**
 * Publish a plot to OK
 */
export async function publishPlotToOK(plot: {
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
}): Promise<{ topicId: string; url: string }> {
    const { text, linkUrl } = formatPlotPost(plot)

    let photoIds: string[] = []

    // Upload image if available
    if (plot.image_url) {
        try {
            const photoId = await uploadPhotoToGroup(plot.image_url)
            photoIds.push(photoId)
        } catch (error) {
            console.error("[OK API] Failed to upload photo:", error)
            // Continue without photo
        }
    }

    return postToGroup({ text, photoIds, linkUrl })
}

/**
 * Rate limiter for OK API (3 requests per second)
 */
export class OKRateLimiter {
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
