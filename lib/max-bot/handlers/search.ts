import { getSession, updateSession } from "@/lib/max-bot/state"
import { showPlotDetails } from "@/lib/max-bot/handlers/plot-detail"
import { searchPlots } from "@/lib/max-bot/utils/db-query"
import { formatPlotCard } from "@/lib/max-bot/utils/format-plot"
import { sendTextMessage } from "@/lib/max-bot/utils/max-api"
import { districtKeyboard, paginationKeyboard } from "@/lib/max-bot/utils/keyboards"

async function sendResults(chatId: string, userId: string, page: number) {
  const session = getSession(userId)
  const { plots, hasMore } = await searchPlots(session.filters, page)

  if (plots.length === 0) {
    await sendTextMessage(chatId, "По вашему запросу ничего не найдено. Выберите другой район.", districtKeyboard(), userId)
    updateSession(userId, { step: "district", page: 0, lastPlotIds: [] })
    return
  }

  const messageLines = [
    `Найдено участков: ${plots.length}${hasMore ? "+" : ""}`,
    "",
    ...plots.map((plot, index) => formatPlotCard(plot, index + page * 5)),
    "",
    "Для подробной карточки отправьте: /plot <номер_участка>",
    `Доступные номера в этой выдаче: ${plots.map((p) => p.id).join(", ")}`,
  ]

  await sendTextMessage(chatId, messageLines.join("\n"), paginationKeyboard(page, hasMore), userId)
  updateSession(userId, {
    step: "results",
    page,
    lastPlotIds: plots.map((plot) => plot.id),
  })
}

export async function handleDistrictSelection(chatId: string, userId: string, district: string) {
  updateSession(userId, {
    filters: {
      ...getSession(userId).filters,
      district,
    },
    page: 0,
  })
  await sendResults(chatId, userId, 0)
}

export async function handleSearchCallback(chatId: string, userId: string, callbackData: string) {
  const [scope, action, value] = callbackData.split(":")
  if (scope !== "search") {
    return
  }

  if (action === "district" && value) {
    await handleDistrictSelection(chatId, userId, value)
    return
  }

  if (action === "page") {
    const page = Number(value)
    if (!Number.isFinite(page) || page < 0) {
      await sendTextMessage(chatId, "Некорректная пагинация", undefined, userId)
      return
    }
    await sendResults(chatId, userId, page)
    return
  }

  if (action === "plot" && value) {
    await showPlotDetails(chatId, value)
  }
}

export async function handleSearchText(chatId: string, userId: string, text: string) {
  const session = getSession(userId)

  if (text.startsWith("/plot ")) {
    const plotId = text.replace("/plot ", "").trim()
    if (!plotId) {
      await sendTextMessage(chatId, "Укажите id участка после команды /plot", undefined, userId)
      return
    }
    await showPlotDetails(chatId, plotId)
    return
  }

  if (session.step === "district") {
    await handleDistrictSelection(chatId, userId, text)
    return
  }

  await sendTextMessage(chatId, "Используйте /start или кнопку «Найти участки», чтобы начать поиск.", undefined, userId)
}
