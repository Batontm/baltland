#!/usr/bin/env npx tsx
/**
 * Sync coordinates for plots using NSPD API with proxy support
 */

import { createClient } from "@supabase/supabase-js"
import * as path from 'path'
import * as fs from 'fs'

// Load .env.local or .env
for (const envFile of ['.env.local', '.env']) {
    const envPath = path.resolve(process.cwd(), envFile)
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')
        envContent.split('\n').forEach((line) => {
            const trimmed = String(line || '').trim()
            if (!trimmed || trimmed.startsWith('#')) return
            const match = trimmed.match(/^([^=]+)=(.*)$/)
            if (!match) return
            const key = match[1].trim()
            let val = match[2]
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1)
            }
            if (key && process.env[key] === undefined) process.env[key] = val
        })
        break
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Proxy configuration - pass as argument or set here
const PROXY_URL = process.argv[2] || process.env.NSPD_PROXY || null

import { NspdClient } from "../lib/nspd-service/nspd-client"

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
    console.log("🔄 Fetching plots without coordinates...")
    console.log("📡 Supabase URL:", supabaseUrl)
    if (PROXY_URL) {
        console.log("🔒 Using proxy:", PROXY_URL.replace(/:[^:@]+@/, ':***@'))
    } else {
        console.log("⚠️  No proxy configured, direct connection")
    }
    console.log("")

    const { data: plots, error } = await supabase
        .from("land_plots")
        .select("id, cadastral_number")
        .is("coordinates_json", null)
        .not("cadastral_number", "is", null)
        .eq("is_active", true)

    if (error) {
        console.error("Error fetching plots:", error.message)
        process.exit(1)
    }

    console.log(`📋 Found ${plots?.length || 0} plots to sync\n`)

    if (!plots || plots.length === 0) {
        console.log("✅ All plots have coordinates!")
        return
    }

    const client = new NspdClient({ proxy: PROXY_URL || undefined })

    let success = 0
    let failed = 0

    for (let i = 0; i < plots.length; i++) {
        const plot = plots[i]
        const progress = `[${i + 1}/${plots.length}]`

        try {
            const { data, error: nspdError } = await client.getObjectInfo(plot.cadastral_number)

            if (nspdError || !data || !data.geometry) {
                console.log(`${progress} ❌ ${plot.cadastral_number} - ${nspdError || 'no geometry'}`)
                failed++
            } else {
                const { error: updateError } = await supabase
                    .from("land_plots")
                    .update({
                        coordinates_json: data.geometry,
                        has_coordinates: true,
                        center_lat: data.centroid_wgs84?.[0] || null,
                        center_lon: data.centroid_wgs84?.[1] || null,
                    })
                    .eq("id", plot.id)

                if (updateError) {
                    console.log(`${progress} ❌ ${plot.cadastral_number} - DB error: ${updateError.message}`)
                    failed++
                } else {
                    console.log(`${progress} ✅ ${plot.cadastral_number} - ${data.geometry_type}`)
                    success++
                }
            }
        } catch (e: any) {
            console.log(`${progress} ❌ ${plot.cadastral_number} - error: ${e.message}`)
            failed++
        }

        await sleep(1500) // 1.5 second delay between requests
    }

    console.log(`
===========================
📊 Summary:
   ✅ Success: ${success}
   ❌ Failed: ${failed}
===========================
`)
}

main()
