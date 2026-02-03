import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { publishPlotToVK } from "@/lib/vk-api"
import { cookies } from "next/headers"

/**
 * POST /api/admin/social/vk/publish
 * Publish a single plot to VK wall
 */
export async function POST(request: NextRequest) {
    try {
        // Check admin auth via session cookie
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get("admin_session")?.value
        if (!sessionToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await createClient()

        const body = await request.json()
        const { plotId } = body

        if (!plotId) {
            return NextResponse.json({ error: "plotId is required" }, { status: 400 })
        }

        // Fetch plot data
        const { data: plot, error: plotError } = await supabase
            .from("land_plots")
            .select("*")
            .eq("id", plotId)
            .single()

        if (plotError || !plot) {
            return NextResponse.json({ error: "Plot not found" }, { status: 404 })
        }

        // Allow re-publishing - just log if already published
        const { data: existingPost } = await supabase
            .from("social_posts")
            .select("*")
            .eq("plot_id", plotId)
            .eq("platform", "vk")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

        if (existingPost) {
            console.log(`Plot ${plotId} already published to VK, republishing...`)
        }

        // Build image URL - prefer map image, fallback to plot image
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://baltland.ru"
        const imageSource = plot.map_image_url || plot.image_url
        const imageUrl = imageSource
            ? (imageSource.startsWith("http") ? imageSource : `${baseUrl}${imageSource}`)
            : null

        console.log(`VK publish: plot ${plotId}, map_image_url=${plot.map_image_url}, image_url=${plot.image_url}, using=${imageUrl}`)


        // Publish to VK
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
            image_url: imageUrl || undefined,
        })

        // Save to database
        const { data: socialPost, error: insertError } = await supabase
            .from("social_posts")
            .insert({
                plot_id: plotId,
                platform: "vk",
                post_type: "wall",
                external_id: String(result.postId),
                external_url: result.url,
                status: "published",
                published_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (insertError) {
            console.error("Failed to save social post:", insertError)
        }

        return NextResponse.json({
            success: true,
            postId: result.postId,
            url: result.url,
            socialPost,
        })
    } catch (error: any) {
        console.error("VK publish error:", error)

        return NextResponse.json({
            error: error.message || "Failed to publish to VK",
        }, { status: 500 })
    }
}

/**
 * DELETE /api/admin/social/vk/publish
 * Delete a VK post for a plot
 */
export async function DELETE(request: NextRequest) {
    try {
        // Check admin auth via session cookie
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get("admin_session")?.value
        if (!sessionToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await createClient()

        const { searchParams } = new URL(request.url)
        const plotId = searchParams.get("plotId")

        if (!plotId) {
            return NextResponse.json({ error: "plotId is required" }, { status: 400 })
        }

        // Find existing post
        const { data: existingPost, error: findError } = await supabase
            .from("social_posts")
            .select("*")
            .eq("plot_id", plotId)
            .eq("platform", "vk")
            .eq("status", "published")
            .single()

        if (findError || !existingPost) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 })
        }

        // Delete from VK
        const { deleteWallPost } = await import("@/lib/vk-api")
        await deleteWallPost(parseInt(existingPost.external_id))

        // Update database
        await supabase
            .from("social_posts")
            .update({ status: "deleted" })
            .eq("id", existingPost.id)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("VK delete error:", error)

        return NextResponse.json({
            error: error.message || "Failed to delete VK post",
        }, { status: 500 })
    }
}

/**
 * GET /api/admin/social/vk/publish
 * Get VK post status for a plot
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { searchParams } = new URL(request.url)
        const plotId = searchParams.get("plotId")

        if (!plotId) {
            return NextResponse.json({ error: "plotId is required" }, { status: 400 })
        }

        const { data: post, error } = await supabase
            .from("social_posts")
            .select("*")
            .eq("plot_id", plotId)
            .eq("platform", "vk")
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

        if (error) {
            return NextResponse.json({ published: false })
        }

        return NextResponse.json({
            published: post.status === "published",
            post,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
