/**
 * Script to link bundle plots - finds secondary plots by cadastral number
 * and updates their bundle_id to point to the primary plot
 */

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.TpNIWp25HrxKsAJrmDxgY2e8F5J5tnmJDW_z2vMpTOo";

interface LandPlot {
    id: string;
    title: string;
    cadastral_number: string | null;
    additional_cadastral_numbers: string[] | null;
    bundle_id: string | null;
    is_bundle_primary: boolean;
    location: string | null;
}

async function fetchPrimaryBundlePlots(): Promise<LandPlot[]> {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?is_bundle_primary=eq.true&title=ilike.*Лот*&select=id,title,cadastral_number,additional_cadastral_numbers,bundle_id,is_bundle_primary,location`;
    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });
    const data = await res.json();
    if (!Array.isArray(data)) {
        console.error("API Error:", data);
        return [];
    }
    return data;
}

async function findPlotByCadastral(cadastral: string): Promise<LandPlot | null> {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?cadastral_number=eq.${encodeURIComponent(cadastral)}&select=id,title,cadastral_number,bundle_id,is_bundle_primary,location`;
    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });
    const plots = await res.json();
    return plots.length > 0 ? plots[0] : null;
}

async function updateBundleId(plotId: string, bundleId: string): Promise<boolean> {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?id=eq.${plotId}`;
    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        body: JSON.stringify({
            bundle_id: bundleId,
            is_bundle_primary: false
        })
    });
    return res.ok;
}

async function main() {
    console.log("🔍 Fetching primary bundle plots...");
    const primaryPlots = await fetchPrimaryBundlePlots();

    console.log(`📦 Found ${primaryPlots.length} primary bundle plots\n`);

    let totalFixed = 0;
    let totalMissing = 0;
    let totalAlreadyLinked = 0;

    for (const primary of primaryPlots) {
        if (!primary.additional_cadastral_numbers || primary.additional_cadastral_numbers.length === 0) {
            console.log(`⚠️  ${primary.location} - ${primary.cadastral_number}: No additional cadastral numbers`);
            continue;
        }

        console.log(`\n📍 ${primary.location} - ${primary.title} (${primary.cadastral_number})`);
        console.log(`   Additional cadastrals: ${primary.additional_cadastral_numbers.join(", ")}`);

        for (const additionalCadastral of primary.additional_cadastral_numbers) {
            const secondaryPlot = await findPlotByCadastral(additionalCadastral);

            if (!secondaryPlot) {
                console.log(`   ❌ ${additionalCadastral}: NOT FOUND in DB`);
                totalMissing++;
                continue;
            }

            // Check if already linked
            if (secondaryPlot.bundle_id === primary.id) {
                console.log(`   ✅ ${additionalCadastral}: Already linked`);
                totalAlreadyLinked++;
                continue;
            }

            // Update bundle_id
            console.log(`   🔗 ${additionalCadastral}: Linking to ${primary.id}...`);
            const success = await updateBundleId(secondaryPlot.id, primary.id);

            if (success) {
                console.log(`   ✅ ${additionalCadastral}: Successfully linked!`);
                totalFixed++;
            } else {
                console.log(`   ❌ ${additionalCadastral}: Failed to update`);
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   ✅ Already linked: ${totalAlreadyLinked}`);
    console.log(`   🔗 Newly linked: ${totalFixed}`);
    console.log(`   ❌ Missing from DB: ${totalMissing}`);
    console.log("=".repeat(60));
}

main().catch(console.error);
