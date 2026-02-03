#!/usr/bin/env npx tsx
/**
 * Sync coordinates for plots without geometry from NSPD
 */

import { createClient } from "@supabase/supabase-js"
import * as path from 'path'
import * as fs from 'fs'

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://nspd.gov.ru/map?thematic=PKK&zoom=16&active_layers=36049",
    "Origin": "https://nspd.gov.ru",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
    console.log("🔄 Fetching plots without coordinates...")

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

    let success = 0
    let failed = 0

    for (let i = 0; i < (plots?.length || 0); i++) {
        const plot = plots![i]
        const progress = `[${i + 1}/${plots!.length}]`

        try {
            const url = `https://nspd.gov.ru/api/geoportal/v2/search/geoportal?query=${encodeURIComponent(plot.cadastral_number)}`
            const res = await fetch(url, { headers: HEADERS })
            const json = await res.json() as any
            const feature = json?.data?.features?.[0]

            if (feature?.geometry) {
                const { error: updateError } = await supabase
                    .from("land_plots")
                    .update({
                        coordinates_json: feature.geometry,
                        has_coordinates: true
                    })
                    .eq("id", plot.id)

                if (updateError) {
                    console.log(`${progress} ❌ ${plot.cadastral_number} - DB error: ${updateError.message}`)
                    failed++
                } else {
                    console.log(`${progress} ✅ ${plot.cadastral_number}`)
                    success++
                }
            } else {
                console.log(`${progress} ❌ ${plot.cadastral_number} - no geometry`)
                failed++
            }
        } catch (e: any) {
            console.log(`${progress} ❌ ${plot.cadastral_number} - error: ${e.message}`)
            failed++
        }

        await sleep(1000) // 1 second delay
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
