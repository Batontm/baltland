import { resetSession, updateSession } from "@/lib/max-bot/state"
import { sendTextMessage } from "@/lib/max-bot/utils/max-api"
import { allDistrictsKeyboard, districtKeyboard, startKeyboard } from "@/lib/max-bot/utils/keyboards"
import { getAllDistricts } from "@/lib/max-bot/utils/db-query"

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
  const districts = await getAllDistricts()
  if (districts.length === 0) {
    await sendTextMessage(chatId, "Не удалось получить список районов. Попробуйте позже.", districtKeyboard(), userId)
    return
  }
  await sendTextMessage(chatId, "Выберите район для поиска:", allDistrictsKeyboard(districts), userId)
}
