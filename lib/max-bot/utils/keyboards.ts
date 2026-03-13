export interface MaxKeyboardButton {
  text: string
  callback_data?: string
  url?: string
}

export type MaxKeyboard = MaxKeyboardButton[][]

export function districtKeyboard(): MaxKeyboard {
  return [
    [
      { text: "Зеленоградский", callback_data: "search:district:Зеленоградский" },
      { text: "Гурьевский", callback_data: "search:district:Гурьевский" },
    ],
    [
      { text: "Светлогорский", callback_data: "search:district:Светлогорский" },
      { text: "Балтийский", callback_data: "search:district:Балтийский" },
    ],
    [{ text: "Показать все", callback_data: "search:district:ALL" }],
  ]
}

export function startKeyboard(): MaxKeyboard {
  return [
    [{ text: "🔍 Найти участки", callback_data: "search:start" }],
  ]
}

export function paginationKeyboard(page: number, hasMore: boolean): MaxKeyboard {
  const rows: MaxKeyboard = []
  if (page > 0) {
    rows.push([{ text: "⬅️ Назад", callback_data: `search:page:${page - 1}` }])
  }
  if (hasMore) {
    rows.push([{ text: "Следующие 5 ➡️", callback_data: `search:page:${page + 1}` }])
  }
  return rows
}
