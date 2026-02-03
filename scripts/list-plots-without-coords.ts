#!/usr/bin/env npx tsx
/**
 * List all plots without coordinates
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
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log("🔍 Fetching plots without coordinates from:", supabaseUrl)
    console.log("")

    const { data, error } = await supabase
        .from("land_plots")
        .select("id, cadastral_number, title, is_active")
        .is("coordinates_json", null)
        .not("cadastral_number", "is", null)
        .order("cadastral_number")

    if (error) {
        console.error("Error:", error.message)
        process.exit(1)
    }

    console.log(`📋 Участки БЕЗ координат (всего: ${data.length}):\n`)

    const active = data.filter(p => p.is_active)
    const inactive = data.filter(p => !p.is_active)

    console.log(`✅ Активные (${active.length}):`)
    active.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.cadastral_number} | ${p.title}`)
    })

    if (inactive.length > 0) {
        console.log(`\n❌ Неактивные (${inactive.length}):`)
        inactive.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.cadastral_number} | ${p.title}`)
        })
    }

    console.log(`\n📊 Итого: ${data.length} участков без координат`)
    console.log(`   - Активных: ${active.length}`)
    console.log(`   - Неактивных: ${inactive.length}`)
}

main()
