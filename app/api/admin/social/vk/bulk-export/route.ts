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

        // Build query for plots
        let query = supabase
            .from("land_plots")
            .select("id", { count: "exact" })
            .eq("status", "active")
            .is("bundle_id", null) // Only primary plots

        // Apply filters
        if (filters.district) {
            query = query.eq("district", filters.district)
        }
        if (filters.location) {
            query = query.eq("location", filters.location)
        }

        const { count, error: countError } = await query

        if (countError) {
            return NextResponse.json({ error: countError.message }, { status: 500 })
        }

        const totalCount = count || 0

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

        // Get all plot IDs to export
        let plotsQuery = supabase
            .from("land_plots")
            .select("id")
            .eq("status", "active")
            .is("bundle_id", null)

        if (filters.district) {
            plotsQuery = plotsQuery.eq("district", filters.district)
        }
        if (filters.location) {
            plotsQuery = plotsQuery.eq("location", filters.location)
        }

        const { data: allPlots, error: plotsError } = await plotsQuery

        if (plotsError) {
            return NextResponse.json({ error: plotsError.message }, { status: 500 })
        }

        // Filter out already published
        const plotsToExport = (allPlots || []).filter(p => !publishedIds.has(p.id))

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
