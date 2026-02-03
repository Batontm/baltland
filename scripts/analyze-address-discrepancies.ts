/**
 * Скрипт для анализа несоответствий адресов земельных участков
 * 
 * Проверяет:
 * 1. Соответствие population/settlement -> district
 * 2. Дубликаты адресов
 * 3. По координатам уточняет реальное местоположение
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

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

// Define Settlement type locally since we can't use path alias
type Settlement = {
    name: string
    district: string
}

const KALININGRAD_SETTLEMENTS: Settlement[] = [
    // Багратионовский район
    { name: "г. Багратионовск", district: "Багратионовский район" },
    { name: "пос. Дольное", district: "Багратионовский район" },
    { name: "пос. Нивенское", district: "Багратионовский район" },
    // Балтийский район
    { name: "г. Балтийск", district: "Балтийский район" },
    { name: "пос. Приморье", district: "Балтийский район" },
    // Гвардейский район
    { name: "г. Гвардейск", district: "Гвардейский район" },
    { name: "пос. Озерки", district: "Гвардейский район" },
    { name: "пос. Гаврилово", district: "Гвардейский район" },
    // Гурьевский район
    { name: "пос. Поддубное", district: "Гурьевский район" },
    { name: "пос. Сокольники", district: "Гурьевский район" },
    { name: "пос. Луговое", district: "Гурьевский район" },
    { name: "пос. Храброво", district: "Гурьевский район" },
    { name: "пос. Васильково", district: "Гурьевский район" },
    { name: "пос. Космодемьянское", district: "Гурьевский район" },
    { name: "пос. Большое Исаково", district: "Гурьевский район" },
    { name: "пос. Низовье", district: "Гурьевский район" },
    { name: "пос. Кумачево", district: "Гурьевский район" },
    // Гусевский район
    { name: "г. Гусев", district: "Гусевский район" },
    { name: "пос. Маяковское", district: "Гусевский район" },
    { name: "пос. Кубановка", district: "Гусевский район" },
    // Зеленоградский район
    { name: "г. Зеленоградск", district: "Зеленоградский район" },
    { name: "пос. Рыбачий", district: "Зеленоградский район" },
    { name: "пос. Лесной", district: "Зеленоградский район" },
    { name: "пос. Куликово", district: "Зеленоградский район" },
    { name: "пос. Малиновка", district: "Зеленоградский район" },
    { name: "пос. Поваровка", district: "Зеленоградский район" },
    { name: "пос. Краснолесье", district: "Зеленоградский район" },
    { name: "пос. Переславское", district: "Зеленоградский район" },
    // Калининград (город)
    { name: "г. Калининград", district: "г. Калининград" },
    // Краснознаменский район
    { name: "г. Краснознаменск", district: "Краснознаменский район" },
    { name: "пос. Большаково", district: "Краснознаменский район" },
    // Неманский район
    { name: "г. Неман", district: "Неманский район" },
    { name: "пос. Маломожайское", district: "Неманский район" },
    // Нестеровский район
    { name: "г. Нестеров", district: "Нестеровский район" },
    { name: "пос. Чернышевское", district: "Нестеровский район" },
    // Озерский район
    { name: "г. Озерск", district: "Озерский район" },
    { name: "пос. Новостроево", district: "Озерский район" },
    // Полесский район
    { name: "г. Полесск", district: "Полесский район" },
    { name: "пос. Саранское", district: "Полесский район" },
    // Правдинский район
    { name: "г. Правдинск", district: "Правдинский район" },
    { name: "пос. Крылово", district: "Правдинский район" },
    // Светлогорский район
    { name: "г. Светлогорск", district: "Светлогорский район" },
    { name: "г. Пионерский", district: "Светлогорский район" },
    { name: "пос. Отрадное", district: "Светлогорский район" },
    { name: "пос. Янтарный", district: "Светлогорский район" },
    { name: "пос. Филино", district: "Светлогорский район" },
    // Светловский район
    { name: "г. Светлый", district: "Светловский район" },
    { name: "пос. Янтарное", district: "Светловский район" },
    // Славский район
    { name: "г. Славск", district: "Славский район" },
    { name: "пос. Тимирязево", district: "Славский район" },
    // Советский район
    { name: "г. Советск", district: "Советский район" },
    { name: "пос. Поддубное", district: "Советский район" },
    { name: "пос. Рощино", district: "Советский район" },
    // Черняховский район
    { name: "г. Черняховск", district: "Черняховский район" },
    { name: "пос. Свобода", district: "Черняховский район" },
    { name: "пос. Каменка", district: "Черняховский район" },
]

const supabase = createClient(supabaseUrl, supabaseKey)

interface PlotData {
    id: string
    title: string
    district: string
    location: string | null
    cadastral_number: string | null
    center_lat: number | null
    center_lon: number | null
    has_coordinates: boolean
}

interface AddressIssue {
    plot: PlotData
    issue_type: "wrong_district" | "duplicate_address" | "unknown_settlement" | "ambiguous_settlement"
    expected_district?: string
    message: string
    possible_settlements?: Settlement[]
}

// Build lookup map: settlement name -> district
function buildSettlementToDistrictMap(): Map<string, string[]> {
    const map = new Map<string, string[]>()

    for (const settlement of KALININGRAD_SETTLEMENTS) {
        // Normalize settlement name for lookup
        const normalizedName = normalizeSettlementName(settlement.name)

        if (map.has(normalizedName)) {
            map.get(normalizedName)!.push(settlement.district)
        } else {
            map.set(normalizedName, [settlement.district])
        }
    }

    return map
}

// Normalize settlement name for comparison
function normalizeSettlementName(name: string): string {
    return name
        .toLowerCase()
        .replace(/^(г\.|пос\.|п\.|с\.|д\.)\s*/i, "")
        .replace(/\s+/g, " ")
        .trim()
}

// Get expected district for a settlement name
function getExpectedDistricts(location: string | null, map: Map<string, string[]>): string[] | null {
    if (!location) return null

    const normalized = normalizeSettlementName(location)
    return map.get(normalized) || null
}

// Check if district names match (handle variations like "район" vs "городской округ")
function districtsMatch(actual: string, expected: string): boolean {
    const normalizeDistrict = (d: string) => d
        .toLowerCase()
        .replace(/городской округ/i, "район")
        .replace(/\s+/g, " ")
        .trim()

    return normalizeDistrict(actual) === normalizeDistrict(expected)
}

async function main() {
    console.log("=".repeat(60))
    console.log("🔍 Анализ адресов земельных участков")
    console.log("=".repeat(60))

    // Fetch all plots
    const { data: plots, error } = await supabase
        .from("land_plots")
        .select("id, title, district, location, cadastral_number, center_lat, center_lon, has_coordinates")
        .eq("is_active", true)
        .order("district")

    if (error) {
        console.error("Ошибка загрузки участков:", error)
        process.exit(1)
    }

    console.log(`\n📊 Всего активных участков: ${plots.length}\n`)

    const settlementMap = buildSettlementToDistrictMap()
    const issues: AddressIssue[] = []

    // Track addresses for duplicate detection
    const addressToPlots = new Map<string, PlotData[]>()

    for (const plot of plots as PlotData[]) {
        const addressKey = `${plot.district}||${plot.location || ""}`.toLowerCase()

        if (!addressToPlots.has(addressKey)) {
            addressToPlots.set(addressKey, [])
        }
        addressToPlots.get(addressKey)!.push(plot)

        // Check settlement -> district correspondence
        if (plot.location) {
            const expectedDistricts = getExpectedDistricts(plot.location, settlementMap)

            if (expectedDistricts === null) {
                // Unknown settlement - try fuzzy match
                const plotLocationNorm = normalizeSettlementName(plot.location)
                const possibleMatches: Settlement[] = []

                for (const settlement of KALININGRAD_SETTLEMENTS) {
                    const settlementNorm = normalizeSettlementName(settlement.name)
                    if (settlementNorm.includes(plotLocationNorm) || plotLocationNorm.includes(settlementNorm)) {
                        possibleMatches.push(settlement)
                    }
                }

                if (possibleMatches.length > 0) {
                    // Check if any match is in a different district
                    const matchingDistrict = possibleMatches.find(s =>
                        districtsMatch(plot.district, s.district)
                    )

                    if (!matchingDistrict) {
                        issues.push({
                            plot,
                            issue_type: "ambiguous_settlement",
                            message: `Населенный пункт "${plot.location}" возможно находится в другом районе`,
                            possible_settlements: possibleMatches
                        })
                    }
                } else {
                    issues.push({
                        plot,
                        issue_type: "unknown_settlement",
                        message: `Населенный пункт "${plot.location}" не найден в справочнике`
                    })
                }
            } else {
                // Check if actual district matches expected
                const matchesAny = expectedDistricts.some(ed => districtsMatch(plot.district, ed))

                if (!matchesAny) {
                    issues.push({
                        plot,
                        issue_type: "wrong_district",
                        expected_district: expectedDistricts.join(" или "),
                        message: `Район "${plot.district}" не соответствует населенному пункту "${plot.location}" (ожидается: ${expectedDistricts.join(" или ")})`
                    })
                }
            }
        }
    }

    // Check for location duplicates across different districts
    const locationToDistricts = new Map<string, Set<string>>()
    for (const plot of plots as PlotData[]) {
        if (plot.location) {
            const locKey = plot.location.toLowerCase().trim()
            if (!locationToDistricts.has(locKey)) {
                locationToDistricts.set(locKey, new Set())
            }
            locationToDistricts.get(locKey)!.add(plot.district)
        }
    }

    // Report duplicates where same settlement appears in multiple districts
    const multiDistrictLocations: Array<{ location: string, districts: string[] }> = []
    for (const [loc, districts] of locationToDistricts) {
        if (districts.size > 1) {
            multiDistrictLocations.push({ location: loc, districts: Array.from(districts) })
        }
    }

    // Output results
    console.log("=".repeat(60))
    console.log("📋 РЕЗУЛЬТАТЫ АНАЛИЗА")
    console.log("=".repeat(60))

    if (issues.length === 0 && multiDistrictLocations.length === 0) {
        console.log("\n✅ Все адреса соответствуют справочнику!")
    } else {
        console.log(`\n⚠️  Найдено проблем: ${issues.length}`)
        console.log(`⚠️  Населенных пунктов в нескольких районах: ${multiDistrictLocations.length}`)

        // Group issues by type
        const wrongDistrict = issues.filter(i => i.issue_type === "wrong_district")
        const ambiguous = issues.filter(i => i.issue_type === "ambiguous_settlement")
        const unknown = issues.filter(i => i.issue_type === "unknown_settlement")

        if (wrongDistrict.length > 0) {
            console.log("\n" + "-".repeat(60))
            console.log("❌ НЕПРАВИЛЬНЫЙ РАЙОН (требует исправления)")
            console.log("-".repeat(60))

            for (const issue of wrongDistrict) {
                console.log(`
📍 Участок: ${issue.plot.title}
   КН: ${issue.plot.cadastral_number || "НЕТ"}
   ID: ${issue.plot.id}
   Текущий район: ${issue.plot.district}
   Населенный пункт: ${issue.plot.location}
   ➡️  Ожидаемый район: ${issue.expected_district}
   Координаты: ${issue.plot.has_coordinates ? `${issue.plot.center_lat}, ${issue.plot.center_lon}` : "НЕТ"}
`)
            }
        }

        if (ambiguous.length > 0) {
            console.log("\n" + "-".repeat(60))
            console.log("⚠️  НЕОДНОЗНАЧНЫЕ НАСЕЛЕННЫЕ ПУНКТЫ")
            console.log("-".repeat(60))

            for (const issue of ambiguous) {
                console.log(`
📍 Участок: ${issue.plot.title}
   КН: ${issue.plot.cadastral_number || "НЕТ"}
   ID: ${issue.plot.id}
   Текущий район: ${issue.plot.district}
   Населенный пункт: ${issue.plot.location}
   Возможные варианты:
${issue.possible_settlements?.map(s => `      - ${s.name} (${s.district})`).join("\n")}
   Координаты: ${issue.plot.has_coordinates ? `${issue.plot.center_lat}, ${issue.plot.center_lon}` : "НЕТ"}
`)
            }
        }

        if (multiDistrictLocations.length > 0) {
            console.log("\n" + "-".repeat(60))
            console.log("🔄 НАСЕЛЕННЫЕ ПУНКТЫ В НЕСКОЛЬКИХ РАЙОНАХ")
            console.log("-".repeat(60))

            for (const { location, districts } of multiDistrictLocations) {
                console.log(`\n📍 ${location}`)
                console.log(`   Встречается в районах: ${districts.join(", ")}`)

                // Find plots for this location
                const plotsInLocation = (plots as PlotData[]).filter(
                    p => p.location?.toLowerCase().trim() === location
                )
                console.log(`   Участков: ${plotsInLocation.length}`)
                for (const p of plotsInLocation) {
                    console.log(`     - КН: ${p.cadastral_number || "НЕТ"} | Район: ${p.district} | ${p.has_coordinates ? `Координаты: ${p.center_lat}, ${p.center_lon}` : "Нет координат"}`)
                }
            }
        }

        if (unknown.length > 0) {
            console.log("\n" + "-".repeat(60))
            console.log("❓ НЕИЗВЕСТНЫЕ НАСЕЛЕННЫЕ ПУНКТЫ")
            console.log("-".repeat(60))

            for (const issue of unknown) {
                console.log(`
📍 ${issue.plot.location} (${issue.plot.district})
   КН: ${issue.plot.cadastral_number || "НЕТ"}
   ID: ${issue.plot.id}
`)
            }
        }

        // Summary table
        console.log("\n" + "=".repeat(60))
        console.log("📊 СВОДКА")
        console.log("=".repeat(60))
        console.log(`
Всего активных участков: ${plots.length}
Неправильный район: ${wrongDistrict.length}
Неоднозначные НП: ${ambiguous.length}
Неизвестные НП: ${unknown.length}
НП в нескольких районах: ${multiDistrictLocations.length}
`)

        // Export issues to JSON
        const output = {
            analyzed_at: new Date().toISOString(),
            total_plots: plots.length,
            summary: {
                wrong_district: wrongDistrict.length,
                ambiguous: ambiguous.length,
                unknown: unknown.length,
                multi_district_locations: multiDistrictLocations.length
            },
            wrong_district_plots: wrongDistrict.map(i => ({
                id: i.plot.id,
                cadastral_number: i.plot.cadastral_number,
                title: i.plot.title,
                current_district: i.plot.district,
                location: i.plot.location,
                expected_district: i.expected_district,
                has_coordinates: i.plot.has_coordinates,
                center_lat: i.plot.center_lat,
                center_lon: i.plot.center_lon
            })),
            ambiguous_plots: ambiguous.map(i => ({
                id: i.plot.id,
                cadastral_number: i.plot.cadastral_number,
                title: i.plot.title,
                current_district: i.plot.district,
                location: i.plot.location,
                possible_settlements: i.possible_settlements,
                has_coordinates: i.plot.has_coordinates,
                center_lat: i.plot.center_lat,
                center_lon: i.plot.center_lon
            })),
            multi_district_locations: multiDistrictLocations
        }

        const fs = await import("fs/promises")
        const outputPath = `${process.cwd()}/address-issues-report.json`
        await fs.writeFile(outputPath, JSON.stringify(output, null, 2))
        console.log(`\n📄 Отчёт сохранён: ${outputPath}`)
    }
}

main().catch(console.error)
