import { MaxKeyboard } from "./keyboards"

const MAX_API_BASE = "https://platform-api.max.ru"

type MaxInlineButton = {
  type: "callback" | "link" | "message"
  text: string
  payload?: string
  url?: string
}

function getToken(): string {
  const token = process.env.MAX_BOT_TOKEN
  if (!token) {
    throw new Error("MAX_BOT_TOKEN is not set")
  }
  return token
}

async function maxRequest(path: string, method: string, body?: Record<string, unknown>) {
  const response = await fetch(`${MAX_API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: getToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MAX API ${method} ${path} failed: ${response.status} ${text}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function postMessage(path: string, text: string, keyboard?: MaxKeyboard) {
  const payload: Record<string, unknown> = {
    text,
  }

  if (keyboard && keyboard.length > 0) {
    const buttons: MaxInlineButton[][] = keyboard
      .map((row) =>
        row
          .map((button) => {
            if (button.callback_data) {
              return {
                type: "callback",
                text: button.text,
                payload: button.callback_data,
              } satisfies MaxInlineButton
            }

            if (button.url) {
              return {
                type: "link",
                text: button.text,
                url: button.url,
              } satisfies MaxInlineButton
            }

            return {
              type: "message",
              text: button.text,
              payload: button.text,
            } satisfies MaxInlineButton
          })
          .filter(Boolean),
      )
      .filter((row) => row.length > 0)

    if (buttons.length > 0) {
      payload.attachments = [
        {
          type: "inline_keyboard",
          payload: { buttons },
        },
      ]
    }
  }

  return maxRequest(path, "POST", payload)
}

function isUnknownRecipientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  return error.message.includes("Unknown recipient")
}

/**
 * Upload an image from URL to MAX and send it with text.
 * Flow: 1) POST /uploads?type=image → get upload URL
 *       2) Fetch image bytes, upload to that URL → get token/photos payload
 *       3) Send message with image attachment
 */
export async function sendImageMessage(
  chatId: string,
  imageUrl: string,
  text: string,
  keyboard?: MaxKeyboard,
  userId?: string
) {
  try {
    // Step 1: Get upload URL from MAX
    const uploadInfo = await maxRequest("/uploads?type=image", "POST")
    const uploadUrl = uploadInfo?.url
    if (!uploadUrl) {
      console.warn("[MAX Bot] No upload URL returned, falling back to text")
      return sendTextMessage(chatId, text, keyboard, userId)
    }

    // Step 2: Fetch image and upload to MAX
    const imageResp = await fetch(imageUrl)
    if (!imageResp.ok) {
      console.warn(`[MAX Bot] Failed to fetch image ${imageUrl}: ${imageResp.status}`)
      return sendTextMessage(chatId, text, keyboard, userId)
    }

    const imageBlob = await imageResp.blob()
    const formData = new FormData()
    formData.append("data", imageBlob, "plot.jpg")

    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    })

    if (!uploadResp.ok) {
      console.warn(`[MAX Bot] Image upload failed: ${uploadResp.status}`)
      return sendTextMessage(chatId, text, keyboard, userId)
    }

    const uploadResult = await uploadResp.json()

    // Step 3: Build attachments array
    const attachments: Record<string, unknown>[] = [
      {
        type: "image",
        payload: uploadResult,
      },
    ]

    // Add keyboard if present
    if (keyboard && keyboard.length > 0) {
      const buttons = keyboard
        .map((row) =>
          row
            .map((button) => {
              if (button.callback_data) {
                return { type: "callback", text: button.text, payload: button.callback_data }
              }
              if (button.url) {
                return { type: "link", text: button.text, url: button.url }
              }
              return { type: "message", text: button.text, payload: button.text }
            })
            .filter(Boolean)
        )
        .filter((row) => row.length > 0)

      if (buttons.length > 0) {
        attachments.push({ type: "inline_keyboard", payload: { buttons } })
      }
    }

    const chatPath = `/messages?chat_id=${encodeURIComponent(chatId)}`
    try {
      return await maxRequest(chatPath, "POST", { text, attachments })
    } catch (error) {
      if (userId && isUnknownRecipientError(error)) {
        const userPath = `/messages?user_id=${encodeURIComponent(userId)}`
        return await maxRequest(userPath, "POST", { text, attachments })
      }
      throw error
    }
  } catch (error) {
    console.error("[MAX Bot] sendImageMessage failed, falling back to text:", error)
    return sendTextMessage(chatId, text, keyboard, userId)
  }
}

export async function sendTextMessage(chatId: string, text: string, keyboard?: MaxKeyboard, userId?: string) {
  const chatPath = `/messages?chat_id=${encodeURIComponent(chatId)}`

  try {
    return await postMessage(chatPath, text, keyboard)
  } catch (error) {
    if (!userId || !isUnknownRecipientError(error)) {
      throw error
    }

    const userPath = `/messages?user_id=${encodeURIComponent(userId)}`
    return postMessage(userPath, text, keyboard)
  }
}
