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
  return translitRuToLat(String(input || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Creates a slug for a plot: district-location-area-id
 */
export function buildPlotSlug(input: {
  location?: string | null
  district?: string | null
  areaSotok?: number | null
  id?: string | number | null
}) {
  const district = input.district ? slugify(input.district.replace(/район/i, "rayon").replace(/городской округ/i, "go")) : ""
  const location = input.location ? slugify(input.location) : ""
  const area = typeof input.areaSotok === "number" && Number.isFinite(input.areaSotok) ? `${input.areaSotok}` : ""
  const id = input.id ? String(input.id) : ""

  const parts = [district, location, area, id].filter(Boolean)
  return parts.join("-")
}

/**
 * Creates a clean slug for a location or district (for catalog)
 */
export function buildLocationSlug(text: string) {
  return slugify(text.replace(/район/i, "rayon").replace(/городской округ/i, "go"))
}

/**
 * Extracts the ID from the end of a slug (e.g. "...-123" -> "123")
 */
export function parseIdFromSlug(slug: string) {
  const parts = slug.split("-")
  return parts[parts.length - 1] || null
}
