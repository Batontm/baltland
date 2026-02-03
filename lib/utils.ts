import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
}

export function translitRuToLat(input: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  }

  return String(input || "")
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase()
      const out = map[lower]
      if (out === undefined) return ch
      return ch === lower ? out : out.toUpperCase()
    })
    .join("")
}

export function slugify(input: string) {
  const raw = translitRuToLat(String(input || "")).toLowerCase()
  return raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function buildPlotSlug(input: { location?: string | null; district?: string | null; areaSotok?: number | null }) {
  const locationLabel = String(input.location || "").trim() || String(input.district || "").trim()
  const area = typeof input.areaSotok === "number" && Number.isFinite(input.areaSotok) ? input.areaSotok : null

  const base = `uchastok${locationLabel ? ` ${locationLabel}` : ""}${area ? ` ${area} sotok` : ""}`
  return slugify(base)
}
