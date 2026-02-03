#!/usr/bin/env npx tsx
/**
 * Импорт описаний участков из JSON файла в базу данных
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

interface PlotDescription {
    cadastral_number: string
    description: string
}

async function main() {
    const jsonPath = process.argv[2] || path.resolve(process.cwd(), 'plots-description.json')

    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ Файл не найден: ${jsonPath}`)
        process.exit(1)
    }

    console.log(`📂 Чтение файла: ${jsonPath}`)
    const content = fs.readFileSync(jsonPath, 'utf8')
    const plots: PlotDescription[] = JSON.parse(content)

    console.log(`📋 Найдено ${plots.length} записей`)
    console.log(`🔄 Импорт в: ${supabaseUrl}\n`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const plot of plots) {
        const cadastral = plot.cadastral_number?.trim()
        const description = plot.description?.trim()

        if (!cadastral || !description) {
            skipped++
            continue
        }

        const { error } = await supabase
            .from('land_plots')
            .update({ description })
            .eq('cadastral_number', cadastral)

        if (error) {
            console.error(`❌ ${cadastral}: ${error.message}`)
            errors++
        } else {
            updated++
            if (updated % 50 === 0) {
                console.log(`✅ Обновлено: ${updated}...`)
            }
        }
    }

    console.log(`\n📊 Результат:`)
    console.log(`   ✅ Обновлено: ${updated}`)
    console.log(`   ⏭️  Пропущено: ${skipped}`)
    console.log(`   ❌ Ошибок: ${errors}`)
}

main()
