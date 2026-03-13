import { sendTextMessage } from "@/lib/max-bot/utils/max-api"
import { formatPlotDetails } from "@/lib/max-bot/utils/format-plot"
import { createAdminClient } from "@/lib/supabase/admin"
import { LandPlot } from "@/lib/types"

export async function showPlotDetails(chatId: string, plotId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from("land_plots").select("*").eq("id", plotId).single()

  if (error || !data) {
    await sendTextMessage(chatId, "Не удалось загрузить карточку участка. Попробуйте другой вариант.")
    return
  }

  await sendTextMessage(chatId, formatPlotDetails(data as LandPlot))
}
