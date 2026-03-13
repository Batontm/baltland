import { Bot } from "@maxhub/max-bot-api"
import { handleStart, startSearch } from "@/lib/max-bot/handlers/start"
import { handleSearchCallback, handleSearchText } from "@/lib/max-bot/handlers/search"

interface NormalizedUpdate {
  chatId: string
  userId: string
  text?: string
  callbackData?: string
}

let botInstance: Bot | null = null

export function getMaxBotInstance() {
  if (botInstance) {
    return botInstance
  }

  const token = process.env.MAX_BOT_TOKEN
  if (!token) {
    throw new Error("MAX_BOT_TOKEN is not set")
  }

  botInstance = new Bot(token)
  return botInstance
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
}

function pickChatId(message: Record<string, unknown>): string | null {
  const chat = asRecord(message.chat)
  const recipient = asRecord(message.recipient)
  const candidates = [chat.chat_id, chat.id, recipient.chat_id, recipient.id]
  const hit = candidates.find((value) => typeof value === "string" || typeof value === "number")
  return hit ? String(hit) : null
}

function pickUserId(message: Record<string, unknown>): string | null {
  const sender = asRecord(message.sender)
  const from = asRecord(message.from)
  const candidates = [sender.user_id, sender.id, from.user_id, from.id, message.user_id, message.id]
  const hit = candidates.find((value) => typeof value === "string" || typeof value === "number")
  return hit ? String(hit) : null
}

function normalizeUpdate(payload: unknown): NormalizedUpdate | null {
  const root = asRecord(payload)

  const callback = asRecord(root.callback)
  const callbackData =
    typeof callback.payload === "string"
      ? callback.payload
      : typeof callback.data === "string"
        ? callback.data
        : undefined
  const callbackMessage = asRecord(callback.message)

  if (callbackData) {
    const chatId = pickChatId(callbackMessage) || pickChatId(root)
    const userId = pickUserId(callback) || pickUserId(callbackMessage) || pickUserId(root)
    if (chatId && userId) {
      return { chatId, userId, callbackData }
    }
  }

  const message = asRecord(root.message)
  const messageBody = asRecord(message.body)
  const text = typeof messageBody.text === "string" ? messageBody.text : typeof message.text === "string" ? message.text : undefined

  const chatId = pickChatId(message)
  const userId = pickUserId(message)

  if (!chatId || !userId) {
    return null
  }

  return { chatId, userId, text }
}

export async function handleMaxUpdate(payload: unknown) {
  const normalized = normalizeUpdate(payload)
  if (!normalized) {
    console.log("[MAX Bot] normalizeUpdate: skip, cannot extract chat/user")
    return
  }

  console.log("[MAX Bot] normalized:", JSON.stringify(normalized))

  if (normalized.callbackData) {
    console.log("[MAX Bot] callbackData:", normalized.callbackData)
    if (normalized.callbackData === "search:start") {
      await startSearch(normalized.chatId, normalized.userId)
      return
    }
    await handleSearchCallback(normalized.chatId, normalized.userId, normalized.callbackData)
    return
  }

  const text = (normalized.text || "").trim()
  if (!text) {
    console.log("[MAX Bot] empty text update")
    return
  }

  if (text.startsWith("search:")) {
    console.log("[MAX Bot] trigger callback route by text payload:", text)
    if (text === "search:start") {
      await startSearch(normalized.chatId, normalized.userId)
      return
    }
    await handleSearchCallback(normalized.chatId, normalized.userId, text)
    return
  }

  const normalizedText = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[🔍🧭!.,:;"'«»]/g, "")
    .trim()

  if (text === "/start" || text === "/help") {
    console.log("[MAX Bot] command start/help:", text)
    await handleStart(normalized.chatId, normalized.userId)
    return
  }

  if (
    text === "/search" ||
    text === "Найти участки" ||
    text === "search:start" ||
    normalizedText === "найти участок" ||
    normalizedText === "найти участки" ||
    normalizedText === "поиск участков" ||
    normalizedText === "searchstart" ||
    normalizedText === "search start" ||
    normalizedText.includes("найти участ")
  ) {
    console.log("[MAX Bot] trigger startSearch by text:", text)
    await startSearch(normalized.chatId, normalized.userId)
    return
  }

  console.log("[MAX Bot] fallback text handler:", text)
  await handleSearchText(normalized.chatId, normalized.userId, text)
}
