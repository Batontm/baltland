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
