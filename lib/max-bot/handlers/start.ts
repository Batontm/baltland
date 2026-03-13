import { resetSession, updateSession } from "@/lib/max-bot/state"
import { sendTextMessage } from "@/lib/max-bot/utils/max-api"
import { districtKeyboard, startKeyboard } from "@/lib/max-bot/utils/keyboards"

export async function handleStart(chatId: string, userId: string) {
  resetSession(userId)
  await sendTextMessage(
    chatId,
    "Привет! Я помогу подобрать земельный участок в Калининградской области.",
    startKeyboard(),
    userId,
  )
}

export async function startSearch(chatId: string, userId: string) {
  updateSession(userId, { step: "district", page: 0, filters: {}, lastPlotIds: [] })
  await sendTextMessage(chatId, "Выберите район для поиска:", districtKeyboard(), userId)
}
