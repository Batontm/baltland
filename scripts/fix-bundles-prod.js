const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

async function updatePlot(id, data) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?id=eq.${id}`;
    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        body: JSON.stringify(data)
    });
    return res.ok;
}

async function findPlotByCadastral(cadastral) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?cadastral_number=eq.${encodeURIComponent(cadastral)}&select=id,cadastral_number,bundle_id,is_bundle_primary,ownership_type`;
    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });
    const plots = await res.json();
    return plots.length > 0 ? plots[0] : null;
}

async function main() {
    const dataPath = path.join(__dirname, '../bundled_plots_data.jsonl');
    const lines = fs.readFileSync(dataPath, 'utf8').split('\n').filter(l => l.trim());

    console.log(`Processing ${lines.length} bundle definitions...`);

    for (const line of lines) {
        const bundle = JSON.parse(line);
        console.log(`\nProcessing bundle for main: ${bundle.main}`);

        // 1. Find primary plot
        const primaryPlot = await findPlotByCadastral(bundle.main);
        if (!primaryPlot) {
            console.error(`  ❌ Primary plot ${bundle.main} not found!`);
            continue;
        }

        const bundleId = primaryPlot.id;

        // Ensure primary is marked as primary
        if (!primaryPlot.is_bundle_primary || primaryPlot.bundle_id !== bundleId) {
            console.log(`  Updating primary plot ${bundle.main} with bundle_id ${bundleId}`);
            await updatePlot(primaryPlot.id, {
                bundle_id: bundleId,
                is_bundle_primary: true
            });
        }

        // 2. Process secondary plots
        for (const plotData of bundle.plots) {
            if (plotData.cadastral === bundle.main) continue; // Skip primary, already handled

            const secondaryPlot = await findPlotByCadastral(plotData.cadastral);
            if (!secondaryPlot) {
                console.error(`  ❌ Secondary plot ${plotData.cadastral} not found!`);
                continue;
            }

            const updateData = {
                bundle_id: bundleId,
                is_bundle_primary: false
            };

            // Special fix for 39:03:091001:861 or any plot tagged as (аренда)
            if (plotData.title.toLowerCase().includes('аренда') || plotData.cadastral === '39:03:091001:861') {
                updateData.ownership_type = 'lease';
                console.log(`  Set ownership_type to lease for ${plotData.cadastral}`);
            }

            console.log(`  Linking ${plotData.cadastral} to bundle ${bundleId}`);
            const success = await updatePlot(secondaryPlot.id, updateData);
            if (success) {
                console.log(`  ✅ Linked ${plotData.cadastral}`);
            } else {
                console.error(`  ❌ Failed to link ${plotData.cadastral}`);
            }
        }
    }

    console.log('\nFinished processing all bundles.');
}

main().catch(console.error);
