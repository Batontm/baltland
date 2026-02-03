// Script to analyze plots with "аренда" in title
// Run with: npx ts-node scripts/analyze-lease-plots.ts

async function analyzeLeasePlots() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.baltland.ru"

    console.log("Fetching plots from API...")

    try {
        const response = await fetch(`${API_URL}/plots`)
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const plots = await response.json()
        console.log(`Total plots: ${plots.length}`)

        // Find plots with "аренда" in title
        const leasePlots = plots.filter((plot: any) => {
            const title = String(plot.title || "").toLowerCase()
            return title.includes("аренда")
        })

        console.log(`\n=== Участки с "аренда" в названии (${leasePlots.length} шт.) ===\n`)

        leasePlots.forEach((plot: any) => {
            const ownershipType = plot.ownership_type || "не указано"
            const needsUpdate = ownershipType !== "lease" && !String(ownershipType).toLowerCase().includes("аренд")

            console.log(`ID: ${plot.id}`)
            console.log(`  Кадастр: ${plot.cadastral_number || "нет"}`)
            console.log(`  Название: ${plot.title}`)
            console.log(`  ownership_type: ${ownershipType}`)
            console.log(`  Требует исправления: ${needsUpdate ? "ДА ⚠️" : "Нет ✓"}`)
            console.log("")
        })

        // Summary
        const needsUpdateCount = leasePlots.filter((p: any) => {
            const ot = String(p.ownership_type || "").toLowerCase()
            return ot !== "lease" && !ot.includes("аренд")
        }).length

        console.log(`\n=== Итого ===`)
        console.log(`Участков с "аренда" в названии: ${leasePlots.length}`)
        console.log(`Из них требуют исправления ownership_type: ${needsUpdateCount}`)

    } catch (error) {
        console.error("Error:", error)
    }
}

analyzeLeasePlots()
