export interface MaxKeyboardButton {
  text: string
  callback_data?: string
  url?: string
}

export type MaxKeyboard = MaxKeyboardButton[][]

const MAX_CONTACT_URL = "https://max.ru/u/f9LHodD0cOKKHLu5hURpYX8eA2FEGHRrVGVpkLRxcsoNxnrzK4kUb-tupvg"

function navigationRows(): MaxKeyboard {
  return [
    [
      { text: "🏠 На главную", callback_data: "nav:home" },
      { text: "⬅️ Назад", callback_data: "nav:back" },
    ],
    [
      { text: "📞 Позвонить нам", callback_data: "contact:call" },
      { text: "💬 Написать", url: MAX_CONTACT_URL },
    ],
  ]
}

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
    ...navigationRows(),
  ]
}

export function allDistrictsKeyboard(districts: string[]): MaxKeyboard {
  const rows: MaxKeyboard = []
  for (let i = 0; i < districts.length; i += 2) {
    const left = districts[i]
    const right = districts[i + 1]
    const row: MaxKeyboardButton[] = [{ text: left, callback_data: `search:district:${left}` }]
    if (right) {
      row.push({ text: right, callback_data: `search:district:${right}` })
    }
    rows.push(row)
  }
  rows.push(...navigationRows())
  return rows
}

export function startKeyboard(): MaxKeyboard {
  return [
    [{ text: "🔍 Найти участки", callback_data: "search:start" }],
    ...navigationRows(),
  ]
}

export function settlementKeyboard(settlements: string[]): MaxKeyboard {
  const rows: MaxKeyboard = []
  for (let i = 0; i < settlements.length; i += 2) {
    const left = settlements[i]
    const right = settlements[i + 1]
    const row: MaxKeyboardButton[] = [{ text: left, callback_data: `search:settlement:${encodeURIComponent(left)}` }]
    if (right) {
      row.push({ text: right, callback_data: `search:settlement:${encodeURIComponent(right)}` })
    }
    rows.push(row)
  }
  rows.push([{ text: "Показать все в районе", callback_data: "search:settlement:ALL" }])
  rows.push(...navigationRows())
  return rows
}

export function paginationKeyboard(page: number, hasMore: boolean): MaxKeyboard {
  const rows: MaxKeyboard = []
  if (page > 0) {
    rows.push([{ text: "⬅️ Назад", callback_data: `search:page:${page - 1}` }])
  }
  if (hasMore) {
    rows.push([{ text: "Следующие 5 ➡️", callback_data: `search:page:${page + 1}` }])
  }
  rows.push(...navigationRows())
  return rows
}
