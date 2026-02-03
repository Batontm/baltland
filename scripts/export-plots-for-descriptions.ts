#!/usr/bin/env npx tsx
/**
 * Экспорт участков БЕЗ описания в CSV для заполнения
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
    console.log("🔍 Загрузка участков БЕЗ описания...")

    const { data, error } = await supabase
        .from("land_plots")
        .select("id, title, cadastral_number, location, area_sotok, price")
        .eq("is_active", true)
        .or("description.is.null,description.eq.")
        .order("location")
        .order("cadastral_number")

    if (error) {
        console.error("Ошибка:", error.message)
        process.exit(1)
    }

    // Фильтруем участки без описания
    const plots = data

    // Создаем CSV
    const csvLines = [
        'cadastral_number,location,title,area_sotok,price,description'
    ]

    plots.forEach(p => {
        const row = [
            p.cadastral_number || '',
            p.location || '',
            (p.title || '').replace(/"/g, '""'),
            p.area_sotok || '',
            p.price || '',
            '' // пустое поле для описания
        ].map(v => `"${v}"`).join(',')
        csvLines.push(row)
    })

    const csvPath = path.resolve(process.cwd(), 'plots-without-description.csv')
    fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8')

    console.log(`\n✅ Сохранено ${plots.length} участков в файл:`)
    console.log(`   ${csvPath}`)
    console.log(`\n📝 Откройте файл в Excel/Google Sheets и заполните колонку "description"`)
}

main()
