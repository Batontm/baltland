#!/usr/bin/env npx tsx
/**
 * Обновление заголовков лотов (bundle) в базе данных
 * 
 * Заменяет "Лот: 2 участка (главный)" на "пос. Название (X сот.)"
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

interface LandPlot {
    id: string
    title: string
    cadastral_number: string
    location: string
    area_sotok: number
    bundle_id: string | null
    is_bundle_primary: boolean
    ownership_type: string | null
}

async function main() {
    console.log("🔍 Загрузка участков с bundle_id...")

    // Получить все участки с bundle_id
    const { data: bundlePlots, error } = await supabase
        .from("land_plots")
        .select("id, title, cadastral_number, location, area_sotok, bundle_id, is_bundle_primary, ownership_type")
        .not("bundle_id", "is", null)
        .eq("is_active", true)
        .order("bundle_id")
        .order("is_bundle_primary", { ascending: false })

    if (error) {
        console.error("Ошибка:", error.message)
        process.exit(1)
    }

    console.log(`📋 Найдено ${bundlePlots.length} участков в лотах`)

    // Группируем по bundle_id
    const bundles = new Map<string, LandPlot[]>()
    for (const plot of bundlePlots) {
        if (!plot.bundle_id) continue
        if (!bundles.has(plot.bundle_id)) {
            bundles.set(plot.bundle_id, [])
        }
        bundles.get(plot.bundle_id)!.push(plot as LandPlot)
    }

    console.log(`📦 Всего лотов: ${bundles.size}`)
    console.log("")

    let updated = 0
    let errors = 0

    for (const [bundleId, plots] of bundles) {
        // Считаем общую площадь
        const totalArea = plots.reduce((sum, p) => sum + (Number(p.area_sotok) || 0), 0)
        const roundedArea = Math.round(totalArea * 100) / 100

        // Берем локацию от primary или первого участка
        const primary = plots.find(p => p.is_bundle_primary) || plots[0]
        const location = primary.location || "Калининградская область"

        // Формируем новый заголовок: "Участок X сот." (без "Лот")
        const newTitle = `Участок ${roundedArea} сот.`

        // Собираем кадастровые номера для описания
        const cadastrals = plots
            .map(p => {
                const type = p.ownership_type === 'lease' ? 'аренда' : 'собственность'
                return `${p.cadastral_number} (${type})`
            })
            .join(', ')

        console.log(`📦 ${bundleId}:`)
        console.log(`   📍 ${location}`)
        console.log(`   📐 ${roundedArea} сот. (${plots.length} уч.)`)
        console.log(`   📋 ${cadastrals}`)

        // Обновляем title для всех участков в лоте
        for (const plot of plots) {
            const plotTitle = plot.is_bundle_primary ? newTitle : `${newTitle} (доп.)`

            const { error: updateError } = await supabase
                .from("land_plots")
                .update({ title: plotTitle })
                .eq("id", plot.id)

            if (updateError) {
                console.error(`   ❌ Ошибка для ${plot.cadastral_number}: ${updateError.message}`)
                errors++
            } else {
                updated++
            }
        }
        console.log(`   ✅ Обновлено`)
        console.log("")
    }

    console.log(`\n📊 Результат:`)
    console.log(`   ✅ Обновлено: ${updated} участков`)
    console.log(`   📦 Лотов: ${bundles.size}`)
    console.log(`   ❌ Ошибок: ${errors}`)
}

main()
