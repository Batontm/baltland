import { notFound, permanentRedirect } from "next/navigation"
import { getLandPlotBundleById } from "@/app/actions"
import { buildPlotSlug } from "@/lib/utils"

interface PlotRedirectPageProps {
  params: Promise<{ id: string }>
}

export default async function PlotRedirectPage({ params }: PlotRedirectPageProps) {
  const { id } = await params
  const bundleResult = await getLandPlotBundleById(id)

  const plot = bundleResult?.plot ?? null
  const bundlePlots = bundleResult?.bundlePlots ?? []
  if (!plot) notFound()

  const totalArea = plot.bundle_id
    ? bundlePlots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
    : Number(plot.area_sotok) || 0

  const slug = buildPlotSlug({
    location: plot.location,
    district: plot.district,
    areaSotok: totalArea,
    id: plot.int_id || plot.id
  })
  permanentRedirect(`/uchastok/${slug}`)
}
