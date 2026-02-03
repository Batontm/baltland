#!/usr/bin/env npx tsx
/**
 * Список участков БЕЗ описания с указанием поселка
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
    console.log("🔍 Загрузка участков БЕЗ описания с:", supabaseUrl)
    console.log("")

    const { data, error } = await supabase
        .from("land_plots")
        .select("id, title, cadastral_number, location, description, is_active")
        .eq("is_active", true)
        .order("location")
        .order("cadastral_number")

    if (error) {
        console.error("Ошибка:", error.message)
        process.exit(1)
    }

    // Фильтруем только участки без описания (null или пустая строка)
    const plotsWithoutDescription = data.filter(p =>
        !p.description || p.description.trim() === ''
    )

    console.log(`📋 Участки БЕЗ описания (всего: ${plotsWithoutDescription.length} из ${data.length}):\n`)

    // Группировка по поселкам
    const byLocation: Record<string, typeof plotsWithoutDescription> = {}

    plotsWithoutDescription.forEach(plot => {
        const loc = plot.location || "Без указания поселка"
        if (!byLocation[loc]) byLocation[loc] = []
        byLocation[loc].push(plot)
    })

    const locations = Object.keys(byLocation).sort()

    locations.forEach(location => {
        const plots = byLocation[location]
        console.log(`\n📍 ${location} (${plots.length} уч.)`)
        console.log("─".repeat(50))
        plots.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.cadastral_number || "—"} | ${p.title}`)
        })
    })

    console.log(`\n\n📊 ИТОГО по поселкам (без описания):`)
    console.log("═".repeat(50))
    locations.forEach(loc => {
        console.log(`  ${loc}: ${byLocation[loc].length} участков`)
    })
    console.log(`\n  ВСЕГО БЕЗ ОПИСАНИЯ: ${plotsWithoutDescription.length} из ${data.length} активных участков`)
}

main()
