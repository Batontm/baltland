import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { getLandPlotBundleById } from "@/app/actions"
import { buildPlotSeoPath } from "@/lib/utils"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

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

  permanentRedirect(seoPath)
}
