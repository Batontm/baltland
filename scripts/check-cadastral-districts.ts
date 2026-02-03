/**
 * Скрипт для проверки соответствия районов по префиксу кадастрового номера
 * 
 * Префикс кадастрового номера (39:XX) определяет район Калининградской области
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
 * Таблица соответствия кадастровых префиксов районам Калининградской области
 * Формат: "39:XX" -> "Название района"
 * 
 * Источник: Росреестр, кадастровые справочники
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

// Альтернативные названия районов для сопоставления
const DISTRICT_ALIASES: Record<string, string[]> = {
    "Багратионовский район": ["Багратионовский район", "Багратионовский городской округ"],
    "Гвардейский район": ["Гвардейский район", "Гвардейский городской округ"],
    "Гурьевский городской округ": ["Гурьевский городской округ", "Гурьевский район"],
    "Гусевский городской округ": ["Гусевский городской округ", "Гусевский район"],
    "Зеленоградский район": ["Зеленоградский район", "Зеленоградский городской округ"],
    "Краснознаменский городской округ": ["Краснознаменский городской округ", "Краснознаменский район"],
    "Неманский городской округ": ["Неманский городской округ", "Неманский район"],
    "Нестеровский район": ["Нестеровский район", "Нестеровский городской округ"],
    "Озерский городской округ": ["Озерский городской округ", "Озерский район"],
    "Полесский район": ["Полесский район", "Полесский городской округ"],
    "Правдинский район": ["Правдинский район", "Правдинский городской округ"],
    "Славский район": ["Славский район", "Славский городской округ"],
    "Советский городской округ": ["Советский городской округ", "Советский район"],
    "Черняховский городской округ": ["Черняховский городской округ", "Черняховский район"],
    "Калининград": ["Калининград", "г. Калининград", "городской округ Калининград"],
    "Балтийский городской округ": ["Балтийский городской округ", "Балтийский район"],
    "Светлогорский городской округ": ["Светлогорский городской округ", "Светлогорский район"],
    "Пионерский городской округ": ["Пионерский городской округ", "Пионерский район"],
    "Светловский городской округ": ["Светловский городской округ", "Светлый городской округ", "Светловский район"],
    "Ладушкинский городской округ": ["Ладушкинский городской округ", "Ладушкинский район"],
    "Мамоновский городской округ": ["Мамоновский городской округ", "Мамоновский район"],
    "Янтарный городской округ": ["Янтарный городской округ", "Янтарный район"],
}

function getCadastralPrefix(cadastralNumber: string): string | null {
    if (!cadastralNumber) return null
    // Формат: 39:XX:XXXXXX:XXX
    const match = cadastralNumber.match(/^(\d+:\d+)/)
    return match ? match[1] : null
}

function getExpectedDistrict(cadastralNumber: string): string | null {
    const prefix = getCadastralPrefix(cadastralNumber)
    if (!prefix) return null
    return CADASTRAL_PREFIX_TO_DISTRICT[prefix] || null
}

function districtsMatch(actual: string, expected: string): boolean {
    // Прямое совпадение
    if (actual === expected) return true

    // Проверяем через алиасы
    const aliases = DISTRICT_ALIASES[expected]
    if (aliases && aliases.includes(actual)) return true

    // Нормализованное сравнение
    const normalizeDistrict = (d: string) => d
        .toLowerCase()
        .replace(/городской округ/g, "")
        .replace(/район/g, "")
        .replace(/\s+/g, " ")
        .trim()

    return normalizeDistrict(actual) === normalizeDistrict(expected)
}

async function main() {
    console.log("=".repeat(70))
    console.log("🔍 Проверка соответствия районов по кадастровому префиксу")
    console.log("=".repeat(70))

    // Выводим таблицу соответствия
    console.log("\n📋 Таблица соответствия кадастровых префиксов:\n")
    console.log("| Префикс | Район                          |")
    console.log("|---------|--------------------------------|")
    for (const [prefix, district] of Object.entries(CADASTRAL_PREFIX_TO_DISTRICT)) {
        console.log(`| ${prefix}   | ${district.padEnd(30)} |`)
    }

    // Загружаем все активные участки
    const { data: plots, error } = await supabase
        .from("land_plots")
        .select("id, title, district, location, cadastral_number, center_lat, center_lon, has_coordinates")
        .eq("is_active", true)
        .not("cadastral_number", "is", null)
        .order("cadastral_number")

    if (error) {
        console.error("Ошибка загрузки участков:", error)
        process.exit(1)
    }

    console.log(`\n📊 Всего активных участков с КН: ${plots.length}\n`)

    const mismatches: Array<{
        id: string
        cadastral_number: string
        prefix: string
        current_district: string
        expected_district: string
        location: string | null
        has_coordinates: boolean
        center_lat: number | null
        center_lon: number | null
    }> = []

    const prefixStats: Record<string, { total: number, correct: number, wrong: number }> = {}

    for (const plot of plots as any[]) {
        const prefix = getCadastralPrefix(plot.cadastral_number)
        const expectedDistrict = getExpectedDistrict(plot.cadastral_number)

        if (!prefix || !expectedDistrict) continue

        // Инициализируем статистику для префикса
        if (!prefixStats[prefix]) {
            prefixStats[prefix] = { total: 0, correct: 0, wrong: 0 }
        }
        prefixStats[prefix].total++

        const match = districtsMatch(plot.district, expectedDistrict)

        if (match) {
            prefixStats[prefix].correct++
        } else {
            prefixStats[prefix].wrong++
            mismatches.push({
                id: plot.id,
                cadastral_number: plot.cadastral_number,
                prefix,
                current_district: plot.district,
                expected_district: expectedDistrict,
                location: plot.location,
                has_coordinates: plot.has_coordinates,
                center_lat: plot.center_lat,
                center_lon: plot.center_lon
            })
        }
    }

    // Статистика по префиксам
    console.log("\n" + "=".repeat(70))
    console.log("📊 СТАТИСТИКА ПО ПРЕФИКСАМ")
    console.log("=".repeat(70))
    console.log("\n| Префикс | Район                          | Всего | ✅ | ❌ |")
    console.log("|---------|--------------------------------|-------|----|----|")

    for (const [prefix, stats] of Object.entries(prefixStats).sort()) {
        const district = CADASTRAL_PREFIX_TO_DISTRICT[prefix] || "?"
        console.log(`| ${prefix}   | ${district.padEnd(30)} | ${String(stats.total).padStart(5)} | ${String(stats.correct).padStart(2)} | ${String(stats.wrong).padStart(2)} |`)
    }

    // Несоответствия
    console.log("\n" + "=".repeat(70))
    console.log(`❌ НЕСООТВЕТСТВИЯ: ${mismatches.length}`)
    console.log("=".repeat(70))

    if (mismatches.length === 0) {
        console.log("\n✅ Все участки соответствуют кадастровым префиксам!")
    } else {
        // Группируем по префиксу
        const byPrefix = new Map<string, typeof mismatches>()
        for (const m of mismatches) {
            if (!byPrefix.has(m.prefix)) {
                byPrefix.set(m.prefix, [])
            }
            byPrefix.get(m.prefix)!.push(m)
        }

        for (const [prefix, items] of byPrefix) {
            console.log(`\n--- Префикс ${prefix} (${CADASTRAL_PREFIX_TO_DISTRICT[prefix]}) ---`)
            console.log(`    Несоответствий: ${items.length}`)

            for (const m of items.slice(0, 10)) { // Показываем первые 10
                console.log(`
📍 КН: ${m.cadastral_number}
   НП: ${m.location || "—"}
   Текущий район: ${m.current_district}
   Ожидаемый район: ${m.expected_district}
   Координаты: ${m.has_coordinates ? `${m.center_lat}, ${m.center_lon}` : "НЕТ"}`)
            }

            if (items.length > 10) {
                console.log(`\n   ... и ещё ${items.length - 10} участков`)
            }
        }
    }

    // Сохраняем результат
    const output = {
        timestamp: new Date().toISOString(),
        total_plots: plots.length,
        total_mismatches: mismatches.length,
        cadastral_mapping: CADASTRAL_PREFIX_TO_DISTRICT,
        prefix_stats: prefixStats,
        mismatches
    }

    const outputPath = path.join(process.cwd(), "cadastral-district-check.json")
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

    console.log(`\n📄 Отчёт сохранён: ${outputPath}`)

    // Сводка
    console.log("\n" + "=".repeat(70))
    console.log("📊 СВОДКА")
    console.log("=".repeat(70))
    console.log(`
Всего участков с КН: ${plots.length}
Несоответствий: ${mismatches.length}
Процент соответствия: ${((plots.length - mismatches.length) / plots.length * 100).toFixed(1)}%
`)
}

main().catch(console.error)
