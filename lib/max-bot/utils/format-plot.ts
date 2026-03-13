import { LandPlot } from "@/lib/types"
import { buildPlotSeoPath } from "@/lib/utils"

const SITE_URL = "https://baltland.ru"

export function formatPlotCard(plot: LandPlot, index: number): string {
  const price = typeof plot.price === "number" ? `${plot.price.toLocaleString("ru-RU")} ₽` : "Цена по запросу"
  const area = plot.area_sotok ? `${plot.area_sotok} сот.` : "Площадь не указана"
  const district = plot.district || "Район не указан"
  const location = plot.location || "Локация не указана"
  const seoUrl = `${SITE_URL}${buildPlotSeoPath({
    district: plot.district,
    location: plot.location,
    intId: plot.int_id || plot.id,
  })}`

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
