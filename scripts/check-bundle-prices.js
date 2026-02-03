const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

async function findPlotByCadastral(cadastral) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?cadastral_number=eq.${encodeURIComponent(cadastral)}&select=id,price`;
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

    console.log(`Comparing prices for ${lines.length} bundles...`);

    let mismatches = 0;
    for (const line of lines) {
        const bundle = JSON.parse(line);
        const plot = await findPlotByCadastral(bundle.main);

        if (!plot) continue;

        if (Math.abs(plot.price - bundle.total_price) > 1) {
            console.log(`Mismatch for ${bundle.main}: DB=${plot.price}, JSONL=${bundle.total_price}`);
            mismatches++;
        }
    }

    console.log(`\nTotal mismatches found: ${mismatches}`);
}

main().catch(console.error);
