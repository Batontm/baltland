// Script to update ownership_type for plots with "(аренда)" in title
// This uses PATCH requests since column should exist after manual migration

const SUPABASE_URL = "https://api.baltland.ru"
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI"

async function updateLeasePlots() {
    console.log("Fetching plots with 'аренда' in title...")

    // Get all plots with аренда in title
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/land_plots?select=id,title,cadastral_number&title=ilike.*аренда*`,
        {
            headers: {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            }
        }
    )

    if (!response.ok) {
        console.error("Failed to fetch plots:", response.status, await response.text())
        return
    }

    const plots = await response.json()
    console.log(`Found ${plots.length} plots with "(аренда)" in title\n`)

    // Update each plot
    let updated = 0
    let failed = 0

    for (const plot of plots) {
        console.log(`Updating ${plot.cadastral_number || plot.id}...`)

        const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/land_plots?id=eq.${plot.id}`,
            {
                method: "PATCH",
                headers: {
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                body: JSON.stringify({ ownership_type: "lease" })
            }
        )

        if (updateResponse.ok) {
            updated++
            console.log(`  ✓ Updated to lease`)
        } else {
            failed++
            const error = await updateResponse.text()
            console.log(`  ✗ Failed: ${error}`)
        }
    }

    console.log(`\n=== Summary ===`)
    console.log(`Updated: ${updated}`)
    console.log(`Failed: ${failed}`)
}

updateLeasePlots()
