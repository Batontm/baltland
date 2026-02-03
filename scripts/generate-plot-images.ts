#!/usr/bin/env npx tsx
/**
 * Batch script to generate map images for all plots without images
 * 
 * Usage:
 *   npx tsx scripts/generate-plot-images.ts [--limit 100] [--dry-run] [--force]
 * 
 * Options:
 *   --limit N    Process only N plots (default: all)
 *   --dry-run    Don't actually generate/upload images, just show what would be done
 *   --force      Regenerate images even for plots that already have images
 */

import { createClient } from "@supabase/supabase-js"
import { generateStaticMapImage } from "../lib/static-map-generator"
import * as fs from "fs"
import * as path from "path"

// Parse args
const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const force = args.includes("--force")
const limitIdx = args.indexOf("--limit")
const limit = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : undefined

// Load env
const envPath = path.join(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8")
    envContent.split("\n").forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].trim()
        }
    })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface PlotRow {
    id: string
    cadastral_number: string | null
    coordinates_json: any
    ownership_type: string | null
    image_url: string | null
    title: string | null
}

async function main() {
    console.log("🗺️  Plot Map Image Generator")
    console.log("===========================")
    if (dryRun) console.log("🔍 DRY RUN MODE - no changes will be made\n")
    if (force) console.log("⚡ FORCE MODE - regenerating all images\n")

    // Fetch plots that need images
    let query = supabase
        .from("land_plots")
        .select("id, cadastral_number, coordinates_json, ownership_type, image_url, title")
        .eq("is_active", true)
        .not("coordinates_json", "is", null)

    if (!force) {
        // Only plots without images or with placeholder
        query = query.or("image_url.is.null,image_url.ilike.%placeholder%")
    }

    if (limit) {
        query = query.limit(limit)
    }

    const { data: plots, error } = await query

    if (error) {
        console.error("Error fetching plots:", error.message)
        process.exit(1)
    }

    if (!plots || plots.length === 0) {
        console.log("✅ No plots need image generation")
        return
    }

    console.log(`📋 Found ${plots.length} plots to process\n`)

    let success = 0
    let failed = 0
    let skipped = 0

    for (let i = 0; i < plots.length; i++) {
        const plot = plots[i] as PlotRow
        const progress = `[${i + 1}/${plots.length}]`

        // Parse geometry
        let geometry = plot.coordinates_json
        if (typeof geometry === "string") {
            try {
                geometry = JSON.parse(geometry)
            } catch {
                console.log(`${progress} ⏭️  ${plot.cadastral_number || plot.id} - Invalid JSON, skipping`)
                skipped++
                continue
            }
        }

        if (!geometry?.type || !geometry?.coordinates) {
            console.log(`${progress} ⏭️  ${plot.cadastral_number || plot.id} - No valid geometry, skipping`)
            skipped++
            continue
        }

        console.log(`${progress} 🔄 Processing ${plot.cadastral_number || plot.title || plot.id}...`)

        if (dryRun) {
            console.log(`${progress} ✅ Would generate image (dry-run)`)
            success++
            continue
        }

        try {
            // Generate map image
            const imageBuffer = await generateStaticMapImage({
                geometry,
                ownershipType: plot.ownership_type,
                isReserved: false,
                width: 600,
                height: 400,
                mapType: "scheme",
            })

            // Upload to Supabase Storage
            const ts = Date.now(); const fileName = `plot-map-${plot.id}-${ts}.png`
            const storagePath = `plot-map-images/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from("land-images")
                .upload(storagePath, imageBuffer, {
                    contentType: "image/png",
                    upsert: true,
                })

            if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`)
            }

            // Get public URL
            const { data: urlData } = supabase.storage.from("land-images").getPublicUrl(storagePath)

            if (!urlData?.publicUrl) {
                throw new Error("Failed to get public URL")
            }

            // Update plot with new image
            const { error: updateError } = await supabase
                .from("land_plots")
                .update({
                    image_url: urlData.publicUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", plot.id)

            if (updateError) {
                throw new Error(`DB update failed: ${updateError.message}`)
            }

            console.log(`${progress} ✅ Generated and uploaded: ${fileName}`)
            success++

            // Rate limiting - wait between requests
            await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (err: any) {
            console.log(`${progress} ❌ Failed: ${err.message}`)
            failed++
        }
    }

    console.log("\n===========================")
    console.log("📊 Summary:")
    console.log(`   ✅ Success: ${success}`)
    console.log(`   ❌ Failed: ${failed}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log("===========================")
}

main().catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
})
