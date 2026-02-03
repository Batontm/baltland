/**
 * Import missing plots to Supabase
 * Run: node scripts/import-missing-plots.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

// Batch size for imports
const BATCH_SIZE = 10;

// Delay between batches (ms)
const BATCH_DELAY = 500;

async function importPlot(plot) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots`;

    const body = {
        cadastral_number: plot.cadastral_number,
        title: plot.title,
        description: plot.description,
        price: plot.price,
        area_sotok: plot.area_sotok,
        district: plot.district,
        location: plot.location,
        land_status: plot.land_status || 'ИЖС',
        ownership_type: plot.ownership_type,
        center_lat: plot.center_lat,
        center_lon: plot.center_lon,
        has_coordinates: plot.has_coordinates || (plot.center_lat !== null),
        is_active: plot.is_active !== false,
        is_featured: plot.is_featured || false,
        has_gas: false,
        has_electricity: false,
        has_water: false,
        has_installment: false,
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    return await res.json();
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const inputPath = process.argv[2] || path.join(process.cwd(), 'missing_plots_for_import.json');

    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Файл не найден: ${inputPath}`);
        console.log('\nСначала запустите: node scripts/extract-missing-plots.js');
        process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('ИМПОРТ УЧАСТКОВ В SUPABASE');
    console.log('='.repeat(60));
    console.log('');

    const plots = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    console.log(`📂 Загружено участков: ${plots.length}`);

    // Optional: limit for testing
    const limit = parseInt(process.argv[3]) || plots.length;
    const toImport = plots.slice(0, limit);
    console.log(`📋 Будет импортировано: ${toImport.length}`);
    console.log('');

    let imported = 0;
    let errors = 0;
    const errorDetails = [];

    // Process in batches
    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
        const batch = toImport.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(toImport.length / BATCH_SIZE);

        console.log(`📦 Пакет ${batchNum}/${totalBatches}...`);

        const results = await Promise.allSettled(
            batch.map(plot => importPlot(plot))
        );

        for (let j = 0; j < results.length; j++) {
            const result = results[j];
            const plot = batch[j];

            if (result.status === 'fulfilled') {
                imported++;
                console.log(`   ✅ ${plot.cadastral_number}`);
            } else {
                errors++;
                const errorMsg = result.reason?.message || 'Unknown error';
                errorDetails.push({ cadastral: plot.cadastral_number, error: errorMsg });
                console.log(`   ❌ ${plot.cadastral_number}: ${errorMsg.substring(0, 60)}`);
            }
        }

        // Delay between batches
        if (i + BATCH_SIZE < toImport.length) {
            await sleep(BATCH_DELAY);
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('РЕЗУЛЬТАТ');
    console.log('='.repeat(60));
    console.log(`✅ Импортировано: ${imported}`);
    console.log(`❌ Ошибок: ${errors}`);

    if (errorDetails.length > 0) {
        console.log('\n📋 Детали ошибок:');
        for (const err of errorDetails.slice(0, 10)) {
            console.log(`   ${err.cadastral}: ${err.error.substring(0, 80)}`);
        }
        if (errorDetails.length > 10) {
            console.log(`   ... и еще ${errorDetails.length - 10} ошибок`);
        }

        // Save errors to file
        const errorsPath = path.join(process.cwd(), 'import_errors.json');
        fs.writeFileSync(errorsPath, JSON.stringify(errorDetails, null, 2), 'utf-8');
        console.log(`\n💾 Ошибки сохранены: ${errorsPath}`);
    }
}

main().catch(console.error);
