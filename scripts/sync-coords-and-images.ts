#!/usr/bin/env npx tsx
/**
 * Sync coordinates and generate map images for plots without coordinates
 * Run: npx tsx scripts/sync-coords-and-images.ts [--limit 50]
 */

import { createClient } from "@supabase/supabase-js"
import { generateStaticMapImage } from "../lib/static-map-generator"
import * as fs from "fs"
import * as path from "path"

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
    console.error("Missing SUPABASE env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Parse args
const args = process.argv.slice(2)
const limitIdx = args.indexOf("--limit")
const limit = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : 100

interface PlotRow {
    id: string
    cadastral_number: string | null
    coordinates_json: any
    center_lat: number | null
    center_lon: number | null
    ownership_type: string | null
    image_url: string | null
}

async function fetchGeometryFromNspd(cadastralNumber: string): Promise<any | null> {
    try {
        // NSPD API endpoint
        const url = `https://nspd.gov.ru/api/aeggis/v3/search?query=${encodeURIComponent(cadastralNumber)}&limit=1`

        const res = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        })

        if (!res.ok) return null

        const data = await res.json()

        if (data?.features?.[0]?.geometry) {
            return data.features[0].geometry
        }

        return null
    } catch (err) {
        console.error(`  NSPD error for ${cadastralNumber}:`, (err as Error).message)
        return null
    }
}

async function generateMapForPlot(plot: PlotRow): Promise<boolean> {
    let geometry = plot.coordinates_json

    if (typeof geometry === "string") {
        try {
            geometry = JSON.parse(geometry)
        } catch {
            return false
        }
    }

    if (!geometry?.type || !geometry?.coordinates) {
        return false
    }

    try {
        const imageBuffer = await generateStaticMapImage({
            geometry,
            ownershipType: plot.ownership_type,
            isReserved: false,
            width: 600,
            height: 400,
            mapType: "scheme",
        })

        const ts = Date.now()
        const fileName = `plot-map-${plot.id}-${ts}.png`
        const storagePath = `plot-map-images/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from("land-images")
            .upload(storagePath, imageBuffer, {
                contentType: "image/png",
                upsert: true,
            })

        if (uploadError) {
            console.error(`  Upload error:`, uploadError.message)
            return false
        }

        const { data: urlData } = supabase.storage.from("land-images").getPublicUrl(storagePath)

        if (!urlData?.publicUrl) return false

        await supabase
            .from("land_plots")
            .update({
                image_url: urlData.publicUrl,
                updated_at: new Date().toISOString(),
            })
            .eq("id", plot.id)

        return true
    } catch (err) {
        console.error(`  Map gen error:`, (err as Error).message)
        return false
    }
}

async function main() {
    console.log("🗺️  Sync Coordinates & Generate Maps")
    console.log("=".repeat(50))
    console.log("")

    // Get plots that need processing (no image or no coordinates)
    const { data: plots, error } = await supabase
        .from("land_plots")
        .select("id, cadastral_number, coordinates_json, center_lat, center_lon, ownership_type, image_url")
        .eq("is_active", true)
        .not("cadastral_number", "is", null)
        .or("image_url.is.null,coordinates_json.is.null")
        .limit(limit)

    if (error) {
        console.error("Error fetching plots:", error.message)
        return
    }

    if (!plots || plots.length === 0) {
        console.log("✅ No plots need processing")
        return
    }

    console.log(`📋 Found ${plots.length} plots to process\n`)

    let coordsSynced = 0
    let imagesGenerated = 0
    let failed = 0

    for (let i = 0; i < plots.length; i++) {
        const plot = plots[i] as PlotRow
        const progress = `[${i + 1}/${plots.length}]`

        console.log(`${progress} ${plot.cadastral_number}...`)

        // Step 1: Check if we need to sync coordinates
        let hasGeometry = !!plot.coordinates_json

        if (!hasGeometry && plot.cadastral_number) {
            console.log(`  📡 Fetching geometry from NSPD...`)
            const geometry = await fetchGeometryFromNspd(plot.cadastral_number)

            if (geometry) {
                // Update plot with geometry
                const { error: updateError } = await supabase
                    .from("land_plots")
                    .update({
                        coordinates_json: geometry,
                        has_coordinates: true,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", plot.id)

                if (!updateError) {
                    plot.coordinates_json = geometry
                    hasGeometry = true
                    coordsSynced++
                    console.log(`  ✅ Geometry synced`)
                }
            } else {
                console.log(`  ⚠️ No geometry found`)
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Step 2: Generate map image if we have geometry
        if (hasGeometry && !plot.image_url) {
            console.log(`  🖼️ Generating map image...`)
            const success = await generateMapForPlot(plot)
            if (success) {
                imagesGenerated++
                console.log(`  ✅ Image generated`)
            } else {
                failed++
                console.log(`  ❌ Image generation failed`)
            }
        }
    }

    console.log("\n" + "=".repeat(50))
    console.log("📊 Summary:")
    console.log(`   📡 Coordinates synced: ${coordsSynced}`)
    console.log(`   🖼️ Images generated: ${imagesGenerated}`)
    console.log(`   ❌ Failed: ${failed}`)
}

main().catch(console.error)
