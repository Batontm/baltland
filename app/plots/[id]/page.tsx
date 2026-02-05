import { notFound, redirect } from "next/navigation"
import { getLandPlotBundleById } from "@/app/actions"
import { buildPlotSeoPath } from "@/lib/utils"

interface PlotRedirectPageProps {
  params: Promise<{ id: string }>
}

export default async function PlotRedirectPage({ params }: PlotRedirectPageProps) {
  const { id } = await params
  const bundleResult = await getLandPlotBundleById(id)

  const plot = bundleResult?.plot ?? null
  if (!plot) notFound()

  const seoPath = buildPlotSeoPath({
    district: plot.district,
    location: plot.location,
    intId: plot.int_id || plot.id,
  })

  redirect(seoPath)
}
