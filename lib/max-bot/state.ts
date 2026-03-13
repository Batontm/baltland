type SearchStep = "idle" | "district" | "results"

export interface MaxBotFilters {
  district?: string
  landStatus?: string
  maxPrice?: number
  installment?: boolean
}

export interface MaxBotSession {
  userId: string
  step: SearchStep
  filters: MaxBotFilters
  page: number
  lastPlotIds: string[]
  updatedAt: number
}

const SESSION_TTL_MS = 30 * 60 * 1000
const sessions = new Map<string, MaxBotSession>()

function createDefaultSession(userId: string): MaxBotSession {
  return {
    userId,
    step: "idle",
    filters: {},
    page: 0,
    lastPlotIds: [],
    updatedAt: Date.now(),
  }
}

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [key, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(key)
    }
  }
}

export function getSession(userId: string): MaxBotSession {
  cleanupExpiredSessions()
  const current = sessions.get(userId)
  if (!current) {
    const next = createDefaultSession(userId)
    sessions.set(userId, next)
    return next
  }

  if (Date.now() - current.updatedAt > SESSION_TTL_MS) {
    const next = createDefaultSession(userId)
    sessions.set(userId, next)
    return next
  }

  return current
}

export function updateSession(userId: string, patch: Partial<MaxBotSession>): MaxBotSession {
  const current = getSession(userId)
  const updated: MaxBotSession = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  }
  sessions.set(userId, updated)
  return updated
}

export function resetSession(userId: string): MaxBotSession {
  const next = createDefaultSession(userId)
  sessions.set(userId, next)
  return next
}
