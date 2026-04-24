import { Bot } from "@maxhub/max-bot-api"
import { handleStart, startSearch } from "@/lib/max-bot/handlers/start"
import { handleBackNavigation, handleSearchCallback, handleSearchText } from "@/lib/max-bot/handlers/search"
import { sendTextMessage } from "@/lib/max-bot/utils/max-api"

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

function pickString(...candidates: unknown[]): string | undefined {
  const hit = candidates.find((value) => typeof value === "string")
  return typeof hit === "string" ? hit : undefined
}

function extractText(message: Record<string, unknown>): string | undefined {
  const body = asRecord(message.body)
  return pickString(body.text, message.text, body.caption)
}

function extractCallbackData(callback: Record<string, unknown>, callbackMessage: Record<string, unknown>): string | undefined {
  const callbackBody = asRecord(callback.body)
  const callbackPayload = asRecord(callback.payload)
  const callbackBodyPayload = asRecord(callbackBody.payload)
  const callbackMessageBody = asRecord(callbackMessage.body)
  const callbackMessagePayload = asRecord(callbackMessage.payload)

  return pickString(
    callback.payload,
    callback.data,
    callback.callback_data,
    callbackBody.payload,
    callbackBody.data,
    callbackBody.callback_data,
    callbackPayload.data,
    callbackPayload.callback_data,
    callbackPayload.payload,
    callbackBodyPayload.data,
    callbackBodyPayload.callback_data,
    callbackBodyPayload.payload,
    callbackMessage.payload,
    callbackMessage.data,
    callbackMessage.callback_data,
    callbackMessageBody.payload,
    callbackMessageBody.data,
    callbackMessageBody.callback_data,
    callbackMessagePayload.data,
    callbackMessagePayload.callback_data,
  )
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
  const callbackMessage = asRecord(callback.message)
  const callbackData = extractCallbackData(callback, callbackMessage)

  const callbackChatId = pickChatId(callbackMessage) || pickChatId(callback) || pickChatId(root)
  const callbackUserId = pickUserId(callback) || pickUserId(callbackMessage) || pickUserId(root)

  if (callbackData && callbackChatId && callbackUserId) {
    return { chatId: callbackChatId, userId: callbackUserId, callbackData }
  }

  if (callbackChatId && callbackUserId) {
    const callbackText = extractText(callbackMessage) || pickString(callback.text, callback.title, callback.value)
    if (callbackText) {
      return { chatId: callbackChatId, userId: callbackUserId, text: callbackText }
    }
  }

  const message = asRecord(root.message)
  const text = extractText(message)
  const chatId = pickChatId(message) || pickChatId(root)
  const userId = pickUserId(message) || pickUserId(root)

  if (!chatId || !userId) {
    return null
  }

  if (callbackData) {
    if (chatId && userId) {
      return { chatId, userId, callbackData }
    }
  }

  return { chatId, userId, text }
}

export async function handleMaxUpdate(payload: unknown) {
  const root = asRecord(payload)

  // Handle "Начать" button — MAX sends update_type: "bot_started"
  // Payload: { chat_id: number, user_id: number, user: {...}, update_type: "bot_started" }
  if (root.update_type === "bot_started") {
    const chatId = root.chat_id != null ? String(root.chat_id) : null
    const userId = root.user_id != null ? String(root.user_id) : null
    if (chatId && userId) {
      console.log("[MAX Bot] bot_started event, chatId:", chatId, "userId:", userId)
      await handleStart(chatId, userId)
      return
    }
    console.log("[MAX Bot] bot_started but cannot extract chat/user:", JSON.stringify(root))
    return
  }

  const normalized = normalizeUpdate(payload)
  if (!normalized) {
    console.log("[MAX Bot] normalizeUpdate: skip, cannot extract chat/user")
    return
  }

  console.log("[MAX Bot] normalized:", JSON.stringify(normalized))

  if (normalized.callbackData) {
    console.log("[MAX Bot] callbackData:", normalized.callbackData)
    if (normalized.callbackData === "nav:home") {
      await handleStart(normalized.chatId, normalized.userId)
      return
    }
    if (normalized.callbackData === "nav:back") {
      await handleBackNavigation(normalized.chatId, normalized.userId)
      return
    }
    if (normalized.callbackData === "search:start") {
      await startSearch(normalized.chatId, normalized.userId)
      return
    }
    if (normalized.callbackData === "contact:call") {
      await sendTextMessage(normalized.chatId, "📞 Позвоните нам: +7 (931) 605-44-84", undefined, normalized.userId)
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
