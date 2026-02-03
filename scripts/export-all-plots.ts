#!/usr/bin/env npx tsx
/**
 * Экспорт ВСЕХ активных участков для генерации уникальных описаний
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
    console.log("🔍 Загрузка ВСЕХ активных участков...")

    const { data, error } = await supabase
        .from("land_plots")
        .select("id, title, cadastral_number, location, area_sotok, price, description")
        .eq("is_active", true)
        .order("location")
        .order("cadastral_number")

    if (error) {
        console.error("Ошибка:", error.message)
        process.exit(1)
    }

    // Создаем CSV
    const csvLines = [
        'cadastral_number,location,title,area_sotok,price,description'
    ]

    data.forEach(p => {
        const row = [
            p.cadastral_number || '',
            p.location || '',
            (p.title || '').replace(/"/g, '""'),
            p.area_sotok || '',
            p.price || '',
            (p.description || '').replace(/"/g, '""').replace(/\n/g, '\\n')
        ].map(v => `"${v}"`).join(',')
        csvLines.push(row)
    })

    const csvPath = path.resolve(process.cwd(), 'all-plots.csv')
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8')

    console.log(`\n✅ Экспортировано ${data.length} участков в файл:`)
    console.log(`   ${csvPath}`)
}

main()
