import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { publishPlotToVK, VKRateLimiter } from "@/lib/vk-api"

/**
 * POST /api/admin/social/vk/process-queue
 * Process pending items in the export queue
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Check auth
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { batchId, limit = 10 } = body

        if (!batchId) {
            return NextResponse.json({ error: "batchId is required" }, { status: 400 })
        }

        // Check batch status
        const { data: batch, error: batchError } = await supabase
            .from("social_export_batches")
            .select("*")
            .eq("id", batchId)
            .single()

        if (batchError || !batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 })
        }

        if (batch.status === "paused" || batch.status === "cancelled") {
            return NextResponse.json({
                message: `Batch is ${batch.status}`,
                batch,
            })
        }

        // Get pending queue items
        const { data: queueItems, error: queueError } = await supabase
            .from("social_export_queue")
            .select("*, land_plots(*)")
            .eq("batch_id", batchId)
            .eq("status", "pending")
            .limit(limit)

        if (queueError) {
            return NextResponse.json({ error: queueError.message }, { status: 500 })
        }

        if (!queueItems?.length) {
            // No more items, mark batch as completed
            await supabase
                .from("social_export_batches")
                .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                })
                .eq("id", batchId)

            return NextResponse.json({
                message: "Batch completed",
                processed: 0,
            })
        }

        const rateLimiter = new VKRateLimiter()
        const results = {
            processed: 0,
            success: 0,
            errors: 0,
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://baltland.ru"

        for (const item of queueItems) {
            const plot = item.land_plots

            if (!plot) {
                // Mark as error if plot doesn't exist
                await supabase
                    .from("social_export_queue")
                    .update({
                        status: "error",
                        error_message: "Plot not found",
                        processed_at: new Date().toISOString(),
                    })
                    .eq("id", item.id)

                results.processed++
                results.errors++
                continue
            }

            // Mark as processing
            await supabase
                .from("social_export_queue")
                .update({ status: "processing" })
                .eq("id", item.id)

            await rateLimiter.wait()

            try {
                const mapImageUrl = plot.map_image_url
                    ? (plot.map_image_url.startsWith("http") ? plot.map_image_url : `${baseUrl}${plot.map_image_url}`)
                    : null

                const result = await publishPlotToVK({
                    id: plot.id,
                    title: plot.title,
                    cadastral_number: plot.cadastral_number,
                    area_sotok: plot.area_sotok,
                    price: plot.price,
                    location: plot.location,
                    district: plot.district,
                    has_gas: plot.has_gas,
                    has_electricity: plot.has_electricity,
                    has_water: plot.has_water,
                    image_url: mapImageUrl || undefined,
                })

                // Save to social_posts
                await supabase
                    .from("social_posts")
                    .insert({
                        plot_id: plot.id,
                        platform: "vk",
                        post_type: "wall",
                        external_id: String(result.postId),
                        external_url: result.url,
                        status: "published",
                        published_at: new Date().toISOString(),
                    })

                // Mark queue item as done
                await supabase
                    .from("social_export_queue")
                    .update({
                        status: "done",
                        processed_at: new Date().toISOString(),
                    })
                    .eq("id", item.id)

                results.success++
            } catch (error: any) {
                const errorMessage = error.message || "Unknown error"

                // Mark queue item as error
                await supabase
                    .from("social_export_queue")
                    .update({
                        status: "error",
                        error_message: errorMessage,
                        attempt_count: (item.attempt_count || 0) + 1,
                        processed_at: new Date().toISOString(),
                    })
                    .eq("id", item.id)

                results.errors++

                // If rate limited, pause for longer
                if (errorMessage.includes("Too many requests") || errorMessage.includes("error_code: 6")) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            }

            results.processed++
        }

        // Update batch progress
        await supabase
            .from("social_export_batches")
            .update({
                processed_count: batch.processed_count + results.processed,
                success_count: batch.success_count + results.success,
                error_count: batch.error_count + results.errors,
            })
            .eq("id", batchId)

        // Check if more items pending
        const { count: remainingCount } = await supabase
            .from("social_export_queue")
            .select("id", { count: "exact", head: true })
            .eq("batch_id", batchId)
            .eq("status", "pending")

        return NextResponse.json({
            success: true,
            results,
            remaining: remainingCount || 0,
            completed: (remainingCount || 0) === 0,
        })
    } catch (error: any) {
        console.error("Process queue error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
