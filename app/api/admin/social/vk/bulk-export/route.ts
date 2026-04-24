import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { publishPlotToVK, VKRateLimiter } from "@/lib/vk-api"

/**
 * POST /api/admin/social/vk/bulk-export
 * Start bulk export of plots to VK
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
        const { filters = {}, batchSize = 50 } = body

        // Build queries for publishable plots: standalone + primary bundle
        let standaloneQuery = supabase
            .from("land_plots")
            .select("id")
            .eq("is_active", true)
            .is("bundle_id", null)

        let bundleQuery = supabase
            .from("land_plots")
            .select("id")
            .eq("is_active", true)
            .not("bundle_id", "is", null)
            .eq("is_bundle_primary", true)

        // Apply filters
        if (filters.district) {
            standaloneQuery = standaloneQuery.eq("district", filters.district)
            bundleQuery = bundleQuery.eq("district", filters.district)
        }
        if (filters.location) {
            standaloneQuery = standaloneQuery.eq("location", filters.location)
            bundleQuery = bundleQuery.eq("location", filters.location)
        }

        const [standaloneRes, bundleRes] = await Promise.all([standaloneQuery, bundleQuery])

        if (standaloneRes.error || bundleRes.error) {
            const errMsg = (standaloneRes.error || bundleRes.error)!.message
            return NextResponse.json({ error: errMsg }, { status: 500 })
        }

        const allPlots = [...(standaloneRes.data || []), ...(bundleRes.data || [])]
        const totalCount = allPlots.length

        if (totalCount === 0) {
            return NextResponse.json({ error: "No plots found to export" }, { status: 400 })
        }

        // Exclude already published plots
        const { data: publishedPlots } = await supabase
            .from("social_posts")
            .select("plot_id")
            .eq("platform", "vk")
            .eq("status", "published")

        const publishedIds = new Set((publishedPlots || []).map(p => p.plot_id))

        // Filter out already published
        const plotsToExport = allPlots.filter(p => !publishedIds.has(p.id))

        if (plotsToExport.length === 0) {
            return NextResponse.json({
                error: "All plots are already published to VK",
                totalCount,
                alreadyPublished: publishedIds.size,
            }, { status: 400 })
        }

        // Create batch
        const { data: batch, error: batchError } = await supabase
            .from("social_export_batches")
            .insert({
                platform: "vk",
                total_count: plotsToExport.length,
                status: "pending",
            })
            .select()
            .single()

        if (batchError || !batch) {
            return NextResponse.json({ error: "Failed to create batch" }, { status: 500 })
        }

        // Create queue items
        const queueItems = plotsToExport.map(plot => ({
            batch_id: batch.id,
            plot_id: plot.id,
            platform: "vk",
            status: "pending",
        }))

        // Insert in chunks
        const chunkSize = 500
        for (let i = 0; i < queueItems.length; i += chunkSize) {
            const chunk = queueItems.slice(i, i + chunkSize)
            await supabase.from("social_export_queue").insert(chunk)
        }

        // Update batch status
        await supabase
            .from("social_export_batches")
            .update({ status: "running", started_at: new Date().toISOString() })
            .eq("id", batch.id)

        return NextResponse.json({
            success: true,
            batchId: batch.id,
            totalCount: plotsToExport.length,
            alreadyPublished: publishedIds.size,
        })
    } catch (error: any) {
        console.error("Bulk export error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * GET /api/admin/social/vk/bulk-export
 * Get status of bulk export
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { searchParams } = new URL(request.url)
        const batchId = searchParams.get("batchId")

        if (batchId) {
            // Get specific batch status
            const { data: batch, error } = await supabase
                .from("social_export_batches")
                .select("*")
                .eq("id", batchId)
                .single()

            if (error || !batch) {
                return NextResponse.json({ error: "Batch not found" }, { status: 404 })
            }

            return NextResponse.json({ batch })
        }

        // Get all batches
        const { data: batches, error } = await supabase
            .from("social_export_batches")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ batches })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
