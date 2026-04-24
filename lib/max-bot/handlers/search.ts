import { getSession, updateSession } from "@/lib/max-bot/state"
import { showPlotDetails } from "@/lib/max-bot/handlers/plot-detail"
import { getAllDistricts, getSettlementsByDistrict, searchPlots } from "@/lib/max-bot/utils/db-query"
import { formatPlotCard } from "@/lib/max-bot/utils/format-plot"
import { sendTextMessage, sendImageMessage } from "@/lib/max-bot/utils/max-api"
import { allDistrictsKeyboard, districtKeyboard, paginationKeyboard, settlementKeyboard } from "@/lib/max-bot/utils/keyboards"
import { handleStart, startSearch } from "@/lib/max-bot/handlers/start"

const DISTRICT_ALIASES: Record<string, string> = {
  "зеленоградский": "Зеленоградский район",
  "зеленоградский район": "Зеленоградский район",
  "гурьевский": "Гурьевский район",
  "гурьевский район": "Гурьевский район",
  "светлогорский": "Светлогорский район",
  "светлогорский район": "Светлогорский район",
  "балтийский": "Балтийский район",
  "балтийский район": "Балтийский район",
  "показать все": "ALL",
  "all": "ALL",
}

function normalizeDistrictInput(input: string): string {
  const normalized = input.trim().toLowerCase()
  return DISTRICT_ALIASES[normalized] || input.trim()
}

async function sendResults(chatId: string, userId: string, page: number) {
  const session = getSession(userId)
  const { plots, hasMore } = await searchPlots(session.filters, page)

  if (plots.length === 0) {
    await sendTextMessage(chatId, "По вашему запросу ничего не найдено. Выберите другой район.", districtKeyboard(), userId)
    updateSession(userId, { step: "district", page: 0, lastPlotIds: [] })
    return
  }

  await sendTextMessage(chatId, `Найдено участков: ${plots.length}${hasMore ? "+" : ""}`, undefined, userId)

  for (let i = 0; i < plots.length; i++) {
    const plot = plots[i]
    const card = formatPlotCard(plot, i)

    if (plot.image_url) {
      await sendImageMessage(chatId, plot.image_url, card, undefined, userId)
    } else {
      await sendTextMessage(chatId, card, undefined, userId)
    }
  }

  await sendTextMessage(chatId, "Выберите действие:", paginationKeyboard(page, hasMore), userId)
  updateSession(userId, {
    step: "results",
    page,
    lastPlotIds: plots.map((plot) => plot.id),
  })
}

async function openSettlementStep(chatId: string, userId: string, district: string) {
  const settlements = await getSettlementsByDistrict(district)

  if (settlements.length === 0) {
    await sendTextMessage(chatId, "В этом районе не найдено посёлков с активными участками. Выберите другой район.", districtKeyboard(), userId)
    updateSession(userId, { step: "district", page: 0, lastPlotIds: [], filters: { ...getSession(userId).filters, settlement: undefined } })
    return
  }

  updateSession(userId, { step: "settlement", page: 0, lastPlotIds: [] })
  await sendTextMessage(chatId, "Выберите посёлок:", settlementKeyboard(settlements), userId)
}

async function openAllDistrictsStep(chatId: string, userId: string) {
  const districts = await getAllDistricts()

  if (districts.length === 0) {
    await sendTextMessage(chatId, "Не удалось получить список районов. Попробуйте позже.", districtKeyboard(), userId)
    updateSession(userId, { step: "district", page: 0, lastPlotIds: [], filters: { ...getSession(userId).filters, district: undefined, settlement: undefined } })
    return
  }

  updateSession(userId, { step: "district", page: 0, lastPlotIds: [], filters: { ...getSession(userId).filters, district: undefined, settlement: undefined } })
  await sendTextMessage(chatId, "Выберите район из полного списка:", allDistrictsKeyboard(districts), userId)
}

export async function handleDistrictSelection(chatId: string, userId: string, district: string) {
  const normalizedDistrict = normalizeDistrictInput(district)

  if (normalizedDistrict === "ALL") {
    await openAllDistrictsStep(chatId, userId)
    return
  }

  updateSession(userId, {
    filters: {
      ...getSession(userId).filters,
      district: normalizedDistrict,
      settlement: undefined,
    },
    page: 0,
  })

  await openSettlementStep(chatId, userId, normalizedDistrict)
}

export async function handleSettlementSelection(chatId: string, userId: string, settlementValue: string) {
  const settlement = settlementValue === "ALL" ? "ALL" : decodeURIComponent(settlementValue)
  updateSession(userId, {
    filters: {
      ...getSession(userId).filters,
      settlement,
    },
    page: 0,
  })
  await sendResults(chatId, userId, 0)
}

export async function handleBackNavigation(chatId: string, userId: string) {
  const session = getSession(userId)

  if (session.step === "results") {
    if (session.filters.district && session.filters.district !== "ALL") {
      await openSettlementStep(chatId, userId, session.filters.district)
      return
    }
    await startSearch(chatId, userId)
    return
  }

  if (session.step === "settlement") {
    await startSearch(chatId, userId)
    return
  }

  await handleStart(chatId, userId)
}

export async function handleSearchCallback(chatId: string, userId: string, callbackData: string) {
  const [scope, action, ...rest] = callbackData.split(":")
  const value = rest.join(":")
  if (scope !== "search") {
    return
  }

  if (action === "district" && value) {
    await handleDistrictSelection(chatId, userId, value)
    return
  }

  if (action === "settlement" && value) {
    await handleSettlementSelection(chatId, userId, value)
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

  if (session.step === "settlement") {
    await handleSettlementSelection(chatId, userId, text)
    return
  }

  await sendTextMessage(chatId, "Используйте /start или кнопку «Найти участки», чтобы начать поиск.", undefined, userId)
}
