const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

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
    console.log("Verifying production data...");

    const plot861 = await findPlotByCadastral("39:03:091001:861");
    const plot1139 = await findPlotByCadastral("39:03:091001:1139");

    if (plot861 && plot1139) {
        console.log(`Plot 861: ownership_type=${plot861.ownership_type}, bundle_id=${plot861.bundle_id}, primary=${plot861.is_bundle_primary}`);
        console.log(`Plot 1139: ownership_type=${plot1139.ownership_type}, bundle_id=${plot1139.bundle_id}, primary=${plot1139.is_bundle_primary}`);

        if (plot861.ownership_type === 'lease' &&
            plot861.bundle_id === plot1139.id &&
            plot1139.bundle_id === plot1139.id &&
            plot1139.is_bundle_primary === true) {
            console.log("✅ Verification successful for target lot!");
        } else {
            console.error("❌ Verification failed for target lot!");
        }
    } else {
        console.error("❌ Target plots not found!");
    }
}

main().catch(console.error);
