import { LandPlot } from "@/lib/types"
import { buildPlotSeoPath } from "@/lib/utils"
import type { PlotWithBundle } from "@/lib/max-bot/utils/db-query"

const SITE_URL = "https://baltland.ru"

export function formatPlotUrl(plot: LandPlot): string {
  return `${SITE_URL}${buildPlotSeoPath({
    district: plot.district,
    location: plot.location,
    intId: plot.int_id || plot.id,
  })}`
}

export function formatPlotCard(plot: PlotWithBundle, index: number): string {
  const price = typeof plot.price === "number" && plot.price > 0
    ? `${plot.price.toLocaleString("ru-RU")} ₽`
    : "Цена по запросу"
  const district = plot.district || "Район не указан"
  const location = plot.location || "Локация не указана"
  const seoUrl = formatPlotUrl(plot)

  // Bundle plot
  if (plot.bundleMembers && plot.bundleCount && plot.bundleCount > 1) {
    const totalArea = plot.bundleTotalArea || Number(plot.area_sotok) || 0
    const lines = [
      `📍 ${index + 1}. ${district}, ${location}`,
      `📦 Лот из ${plot.bundleCount} участков`,
      `📐 ${totalArea} сот. | 💰 ${price}`,
      `🏷 ВРИ: ${plot.land_status || "не указан"}`,
      ``,
      `Кадастровые номера:`,
    ]
    for (const m of plot.bundleMembers) {
      lines.push(`  • КН ${m.cadastral_number} — ${m.area_sotok} сот.`)
    }
    lines.push(``, `🔗 ${seoUrl}`)
    return lines.join("\n")
  }

  // Single plot
  const area = plot.area_sotok ? `${plot.area_sotok} сот.` : "Площадь не указана"
  return [
    `📍 ${index + 1}. ${district}, ${location}`,
    `📐 ${area} | 💰 ${price}`,
    `🏷 ВРИ: ${plot.land_status || "не указан"}`,
    `🔗 ${seoUrl}`,
  ].join("\n")
}

export function formatPlotDetails(plot: LandPlot): string {
  const price = typeof plot.price === "number" ? `${plot.price.toLocaleString("ru-RU")} ₽` : "Цена по запросу"
  const area = plot.area_sotok ? `${plot.area_sotok} сот.` : "—"
  const installment = plot.has_installment ? "Да" : "Нет"

  return [
    `🏞 ${plot.title || "Участок"}`,
    `📍 ${plot.district || "—"}, ${plot.location || "—"}`,
    `💰 ${price}`,
    `📐 ${area}`,
    `🏷 ВРИ: ${plot.land_status || "—"}`,
    `🧾 Кадастровый: ${plot.cadastral_number || "—"}`,
    `💳 Рассрочка: ${installment}`,
  ].join("\n")
}
