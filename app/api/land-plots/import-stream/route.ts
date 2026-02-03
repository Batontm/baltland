import { NextRequest } from "next/server"
import type { LandPlotData } from "@/lib/types"
import { syncLandPlotsFromData } from "@/app/actions"

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
      }

      try {
        const body = (await request.json()) as {
          landPlotsData: LandPlotData[]
          settlement: string
          replaceAll?: boolean
          autoResolve?: boolean
          logData?: { fileName: string; fileType: string }
        }

        const landPlotsData = Array.isArray(body?.landPlotsData) ? body.landPlotsData : []
        const settlement = String(body?.settlement || "").trim()

        if (!settlement) {
          send({ type: "error", message: "Settlement is required" })
          controller.close()
          return
        }

        send({ type: "start", total: landPlotsData.length })

        await syncLandPlotsFromData(
          landPlotsData,
          settlement,
          Boolean(body?.replaceAll),
          body?.logData,
          Boolean(body?.autoResolve),
          false,
          (event) => {
            // Pass through events as NDJSON
            send(event)
          },
        )

        send({ type: "done" })
        controller.close()
      } catch (err: any) {
        send({ type: "error", message: err?.message || String(err) })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
