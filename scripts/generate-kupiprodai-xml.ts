#!/usr/bin/env npx tsx

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import { buildPlotSeoPath } from "../lib/utils"

const CONTACT_NAME = "Алексей"
const CONTACT_PHONE = "+79316054484"
const OUTPUT_FILE = "kupiprodai-plots.xml"

const TARGET_CADASTRALS = [
  "39:03:060007:1533",
  "39:03:090913:631",
  "39:03:090913:630",
  "39:03:090913:633",
  "39:03:060011:926",
  "39:03:040009:57",
  "39:03:091001:861",
  "39:03:090920:1076",
  "39:03:090920:940",
]

interface PlotRow {
  id: string
  int_id: number | null
  title: string | null
  description: string | null
  price: number | null
  area_sotok: number | null
  district: string | null
  location: string | null
  cadastral_number: string | null
  image_url: string | null
  updated_at: string | null
  center_lat: number | null
  center_lon: number | null
}

interface PlotImageRow {
  plot_id: string
  public_url: string
  is_cover: boolean
  sort_order: number | null
}

function loadEnvFromDotenvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return

  const envContent = fs.readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
    const trimmed = String(line || "").trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (!match) return

    const key = match[1].trim()
    let value = match[2].trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  })
}

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function formatDate(value: string | null): string {
  if (!value) return new Date().toISOString().slice(0, 19).replace("T", " ")
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 19).replace("T", " ")
  return date.toISOString().slice(0, 19).replace("T", " ")
}

function buildAdText(plot: PlotRow): string {
  const title = plot.title?.trim() || `Земельный участок ${plot.cadastral_number || ""}`.trim()
  const description = plot.description?.trim() || "Описание уточняйте по телефону."
  const area = typeof plot.area_sotok === "number" ? `${plot.area_sotok} сот.` : "площадь уточняется"
  const location = plot.location?.trim() || "Калининградская область"

  return `${title}. Площадь: ${area}. Локация: ${location}. ${description}`
}

async function main() {
  loadEnvFromDotenvLocal()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: plots, error: plotsError } = await supabase
    .from("land_plots")
    .select(
      "id, int_id, title, description, price, area_sotok, district, location, cadastral_number, image_url, updated_at, center_lat, center_lon"
    )
    .in("cadastral_number", TARGET_CADASTRALS)

  if (plotsError) {
    throw new Error(`Failed to fetch land plots: ${plotsError.message}`)
  }

  const plotRows = (plots || []) as PlotRow[]
  const plotIds = plotRows.map((plot) => plot.id)

  const imageByPlotId = new Map<string, string>()

  if (plotIds.length > 0) {
    const { data: images, error: imagesError } = await supabase
      .from("land_plot_images")
      .select("plot_id, public_url, is_cover, sort_order")
      .in("plot_id", plotIds)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true })

    if (imagesError) {
      throw new Error(`Failed to fetch plot images: ${imagesError.message}`)
    }

    ;((images || []) as PlotImageRow[]).forEach((image) => {
      if (!imageByPlotId.has(image.plot_id) && image.public_url) {
        imageByPlotId.set(image.plot_id, image.public_url)
      }
    })
  }

  const plotsByCadastral = new Map<string, PlotRow>()
  plotRows.forEach((plot) => {
    if (plot.cadastral_number) {
      plotsByCadastral.set(plot.cadastral_number, plot)
    }
  })

  let missing = TARGET_CADASTRALS.filter((cad) => !plotsByCadastral.has(cad))

  if (missing.length > 0) {
    for (const cad of missing) {
      const { data: additionalMatch } = await supabase
        .from("land_plots")
        .select(
          "id, int_id, title, description, price, area_sotok, district, location, cadastral_number, image_url, updated_at, center_lat, center_lon"
        )
        .contains("additional_cadastral_numbers", [cad])
        .limit(1)
        .maybeSingle()

      if (additionalMatch) {
        plotsByCadastral.set(cad, additionalMatch as PlotRow)
      }
    }

    missing = TARGET_CADASTRALS.filter((cad) => !plotsByCadastral.has(cad))
  }

  const rowsXml: string[] = []

  for (const cadastral of TARGET_CADASTRALS) {
    const plot = plotsByCadastral.get(cadastral)
    if (!plot) continue

    const siteUrl = `https://baltland.ru${buildPlotSeoPath({
      district: plot.district,
      location: plot.location,
      intId: plot.int_id || plot.id,
    })}`

    const title = plot.title?.trim() || `Земельный участок ${cadastral}`
    const adver = buildAdText(plot)
    const imageUrl = (plot.image_url && plot.image_url.trim()) || imageByPlotId.get(plot.id) || ""

    rowsXml.push(`  <row>\n    <id>${escapeXml(plot.int_id || plot.id)}</id>\n    <contacts>${escapeXml(CONTACT_NAME)}</contacts>\n    <phone>${escapeXml(CONTACT_PHONE)}</phone>\n    <city>${escapeXml("Калининград")}</city>\n    <address>${escapeXml(plot.location || "Калининградская область")}</address>\n    <latitude>${escapeXml(plot.center_lat ?? "")}</latitude>\n    <longitude>${escapeXml(plot.center_lon ?? "")}</longitude>\n    <category>${escapeXml("Земельные участки")}</category>\n    <title>${escapeXml(title)}</title>\n    <adver>${escapeXml(adver)}</adver>\n    <price>${escapeXml(plot.price ?? "")}</price>\n    <updated>${escapeXml(formatDate(plot.updated_at))}</updated>\n    <image1>${escapeXml(imageUrl)}</image1>\n    <cadastral_number>${escapeXml(cadastral)}</cadastral_number>\n    <area_sotok>${escapeXml(plot.area_sotok ?? "")}</area_sotok>\n    <district>${escapeXml(plot.district || "")}</district>\n    <url>${escapeXml(siteUrl)}</url>\n  </row>`)
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<rows>\n${rowsXml.join("\n")}\n</rows>\n`

  const outputPath = path.resolve(process.cwd(), OUTPUT_FILE)
  fs.writeFileSync(outputPath, xmlContent, "utf8")

  console.log(`✅ XML сформирован: ${outputPath}`)
  console.log(`   Добавлено участков: ${rowsXml.length}`)
  if (missing.length > 0) {
    console.log(`   Не найдены в БД (${missing.length}): ${missing.join(", ")}`)
  }
}

main().catch((error) => {
  console.error("❌ Ошибка генерации XML:", error)
  process.exit(1)
})
