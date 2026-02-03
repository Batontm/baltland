/**
 * Скрипт для исправления районов по кадастровому префиксу
 * 
 * Использует таблицу соответствия 39:XX -> район
 */

import * as fs from "fs"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"

// Load env from .env.local
const envPath = path.join(process.cwd(), ".env.local")
const envContent = fs.readFileSync(envPath, "utf-8")
const envVars: Record<string, string> = {}
for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
        envVars[match[1].trim()] = match[2].trim()
    }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Таблица соответствия кадастровых префиксов районам
 */
const CADASTRAL_PREFIX_TO_DISTRICT: Record<string, string> = {
    "39:01": "Багратионовский район",
    "39:02": "Гвардейский район",
    "39:03": "Гурьевский городской округ",
    "39:04": "Гусевский городской округ",
    "39:05": "Зеленоградский район",
    "39:06": "Краснознаменский городской округ",
    "39:07": "Неманский городской округ",
    "39:08": "Нестеровский район",
    "39:09": "Озерский городской округ",
    "39:10": "Полесский район",
    "39:11": "Правдинский район",
    "39:12": "Славский район",
    "39:13": "Советский городской округ",
    "39:14": "Черняховский городской округ",
    "39:15": "Калининград",
    "39:16": "Балтийский городской округ",
    "39:17": "Светлогорский городской округ",
    "39:18": "Пионерский городской округ",
    "39:19": "Светловский городской округ",
    "39:20": "Ладушкинский городской округ",
    "39:21": "Мамоновский городской округ",
    "39:22": "Янтарный городской округ",
}

async function main() {
    console.log("=".repeat(60))
    console.log("🔧 Исправление районов по кадастровому префиксу")
    console.log("=".repeat(60))

    // Загружаем отчёт о несоответствиях
    const reportPath = path.join(process.cwd(), "cadastral-district-check.json")

    let report: any
    try {
        const reportContent = fs.readFileSync(reportPath, "utf-8")
        report = JSON.parse(reportContent)
    } catch (e) {
        console.error("Не удалось загрузить отчёт cadastral-district-check.json")
        console.log("Запустите сначала: npx tsx scripts/check-cadastral-districts.ts")
        process.exit(1)
    }

    const mismatches = report.mismatches || []
    console.log(`\n📊 Найдено несоответствий: ${mismatches.length}`)

    if (mismatches.length === 0) {
        console.log("✅ Нет участков для исправления!")
        return
    }

    let fixed = 0
    let failed = 0

    for (const m of mismatches) {
        const newDistrict = CADASTRAL_PREFIX_TO_DISTRICT[m.prefix]

        if (!newDistrict) {
            console.log(`❌ Неизвестный префикс ${m.prefix} для ${m.cadastral_number}`)
            failed++
            continue
        }

        console.log(`📍 ${m.cadastral_number}: ${m.current_district} → ${newDistrict}`)

        const { error } = await supabase
            .from("land_plots")
            .update({
                district: newDistrict,
                updated_at: new Date().toISOString()
            })
            .eq("id", m.id)

        if (error) {
            console.log(`   ❌ Ошибка: ${error.message}`)
            failed++
        } else {
            fixed++
        }
    }

    console.log("\n" + "=".repeat(60))
    console.log("📊 РЕЗУЛЬТАТЫ")
    console.log("=".repeat(60))
    console.log(`
✅ Исправлено: ${fixed}
❌ Ошибки: ${failed}
`)
}

main().catch(console.error)
