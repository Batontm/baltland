/**
 * Скрипт для исправления районов у существующих участков
 * 
 * Находит участки с неправильными районами и исправляет их,
 * используя определение района по координатам через Yandex Geocoder
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
const yandexApiKey = envVars.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// Нормализация названий районов
const DISTRICT_NAME_MAPPING: Record<string, string> = {
    "Янтарный городской округ": "Янтарный городской округ",
    "городской округ Янтарный": "Янтарный городской округ",
    "Янтарный": "Янтарный городской округ",

    "Зеленоградский район": "Зеленоградский район",
    "Зеленоградский городской округ": "Зеленоградский район",

    "Гурьевский городской округ": "Гурьевский городской округ",
    "Гурьевский район": "Гурьевский городской округ",

    "Светлогорский городской округ": "Светлогорский городской округ",
    "Светлогорский район": "Светлогорский городской округ",

    "Светловский городской округ": "Светловский городской округ",
    "Светлый городской округ": "Светловский городской округ",

    "Пионерский городской округ": "Пионерский городской округ",

    "Балтийский городской округ": "Балтийский городской округ",
    "Балтийский район": "Балтийский городской округ",

    "Багратионовский район": "Багратионовский район",

    "Гвардейский район": "Гвардейский район",

    "Гусевский городской округ": "Гусевский городской округ",

    "Краснознаменский городской округ": "Краснознаменский городской округ",

    "Ладушкинский городской округ": "Ладушкинский городской округ",

    "Мамоновский городской округ": "Мамоновский городской округ",

    "Неманский городской округ": "Неманский городской округ",

    "Нестеровский район": "Нестеровский район",

    "Озерский городской округ": "Озерский городской округ",

    "Полесский район": "Полесский район",

    "Правдинский район": "Правдинский район",

    "Славский район": "Славский район",

    "Советский городской округ": "Советский городской округ",

    "Черняховский городской округ": "Черняховский городской округ",

    "Калининград": "Калининград",
    "городской округ Калининград": "Калининград",
    "город Калининград": "Калининград",
}

interface YandexGeocoderResponse {
    response: {
        GeoObjectCollection: {
            featureMember: Array<{
                GeoObject: {
                    metaDataProperty: {
                        GeocoderMetaData: {
                            Address: {
                                Components: Array<{
                                    kind: string
                                    name: string
                                }>
                            }
                        }
                    }
                }
            }>
        }
    }
}

async function detectDistrictByCoordinates(lat: number, lon: number): Promise<string | null> {
    if (!yandexApiKey) {
        console.warn("[detectDistrictByCoordinates] Yandex Maps API key not configured")
        return null
    }

    try {
        const url = `https://geocode-maps.yandex.ru/1.x/?geocode=${lon},${lat}&kind=district&results=3&format=json&apikey=${yandexApiKey}`

        const response = await fetch(url)

        if (!response.ok) {
            console.error(`[detectDistrictByCoordinates] Yandex API error: ${response.status}`)
            return null
        }

        const data = await response.json() as YandexGeocoderResponse
        const members = data?.response?.GeoObjectCollection?.featureMember ?? []

        for (const member of members) {
            const components = member?.GeoObject?.metaDataProperty?.GeocoderMetaData?.Address?.Components ?? []

            for (const component of components) {
                if (component.kind === "district" || component.kind === "area") {
                    const rawName = component.name

                    const normalized = DISTRICT_NAME_MAPPING[rawName]
                    if (normalized) {
                        return normalized
                    }

                    for (const [key, value] of Object.entries(DISTRICT_NAME_MAPPING)) {
                        if (rawName.includes(key) || key.includes(rawName)) {
                            return value
                        }
                    }

                    return rawName
                }
            }
        }

        return null
    } catch (error) {
        console.error("[detectDistrictByCoordinates] Error:", error)
        return null
    }
}

async function main() {
    console.log("=".repeat(60))
    console.log("🔧 Исправление районов земельных участков")
    console.log("=".repeat(60))

    // Загружаем отчёт о несоответствиях
    const reportPath = path.join(process.cwd(), "address-issues-report.json")

    let report: any
    try {
        const reportContent = fs.readFileSync(reportPath, "utf-8")
        report = JSON.parse(reportContent)
    } catch (e) {
        console.error("Не удалось загрузить отчёт address-issues-report.json")
        console.log("Запустите сначала: npx tsx scripts/analyze-address-discrepancies.ts")
        process.exit(1)
    }

    const wrongDistrictPlots = report.wrong_district_plots || []
    console.log(`\n📊 Найдено участков с неправильным районом: ${wrongDistrictPlots.length}`)

    if (wrongDistrictPlots.length === 0) {
        console.log("✅ Нет участков для исправления!")
        return
    }

    let fixed = 0
    let failed = 0
    let skipped = 0

    const results: Array<{
        cadastral: string
        oldDistrict: string
        newDistrict: string | null
        status: "fixed" | "failed" | "skipped"
    }> = []

    for (const plot of wrongDistrictPlots) {
        console.log(`\n📍 Обработка: ${plot.cadastral_number}`)
        console.log(`   Текущий район: ${plot.current_district}`)
        console.log(`   Населенный пункт: ${plot.location}`)

        let newDistrict: string | null = null

        // Если есть координаты - определяем район по ним
        if (plot.has_coordinates && plot.center_lat && plot.center_lon) {
            console.log(`   Координаты: ${plot.center_lat}, ${plot.center_lon}`)

            newDistrict = await detectDistrictByCoordinates(plot.center_lat, plot.center_lon)

            // Добавляем задержку чтобы не превысить лимит API
            await new Promise(resolve => setTimeout(resolve, 300))
        }

        // Если район не определился - используем ожидаемый район из отчёта
        if (!newDistrict && plot.expected_district) {
            console.log(`   ⚠️ Район не определён по координатам, используем ожидаемый: ${plot.expected_district}`)
            newDistrict = plot.expected_district
        }

        if (!newDistrict) {
            console.log(`   ❌ Не удалось определить район`)
            failed++
            results.push({
                cadastral: plot.cadastral_number,
                oldDistrict: plot.current_district,
                newDistrict: null,
                status: "failed"
            })
            continue
        }

        // Проверяем что район действительно изменился
        if (newDistrict === plot.current_district) {
            console.log(`   ⏭️ Район уже правильный`)
            skipped++
            results.push({
                cadastral: plot.cadastral_number,
                oldDistrict: plot.current_district,
                newDistrict: newDistrict,
                status: "skipped"
            })
            continue
        }

        console.log(`   ➡️ Новый район: ${newDistrict}`)

        // Обновляем район в БД
        const { error } = await supabase
            .from("land_plots")
            .update({
                district: newDistrict,
                updated_at: new Date().toISOString()
            })
            .eq("id", plot.id)

        if (error) {
            console.log(`   ❌ Ошибка обновления: ${error.message}`)
            failed++
            results.push({
                cadastral: plot.cadastral_number,
                oldDistrict: plot.current_district,
                newDistrict: newDistrict,
                status: "failed"
            })
        } else {
            console.log(`   ✅ Исправлено!`)
            fixed++
            results.push({
                cadastral: plot.cadastral_number,
                oldDistrict: plot.current_district,
                newDistrict: newDistrict,
                status: "fixed"
            })
        }
    }

    // Итоги
    console.log("\n" + "=".repeat(60))
    console.log("📊 РЕЗУЛЬТАТЫ")
    console.log("=".repeat(60))
    console.log(`
Всего участков: ${wrongDistrictPlots.length}
✅ Исправлено: ${fixed}
⏭️ Пропущено (уже правильно): ${skipped}
❌ Ошибки: ${failed}
`)

    // Сохраняем результаты
    const outputPath = path.join(process.cwd(), "district-fix-results.json")
    fs.writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        total: wrongDistrictPlots.length,
        fixed,
        skipped,
        failed,
        results
    }, null, 2))

    console.log(`📄 Результаты сохранены: ${outputPath}`)
}

main().catch(console.error)
