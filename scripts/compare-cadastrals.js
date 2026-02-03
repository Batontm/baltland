/**
 * Compare cadastral numbers between dump.sql (old DB) and current Supabase DB
 * Run: node scripts/compare-cadastrals.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

function extractFromDump() {
    const dumpPath = path.join(process.cwd(), 'dump.sql');
    const content = fs.readFileSync(dumpPath, 'utf-8');

    // Find the COPY block for plots table
    const copyMatch = content.match(/COPY public\.plots \([^)]+\) FROM stdin;([\s\S]*?)\\\./);
    if (!copyMatch) {
        console.error('Could not find plots COPY block in dump.sql');
        return [];
    }

    const dataBlock = copyMatch[1].trim();
    const lines = dataBlock.split('\n').filter(line => line.trim());

    const plots = [];

    for (const line of lines) {
        const parts = line.split('\t');
        // Format: id, listing_id, cadastral_number, land_use_id, land_category_id, area, address, polygon, centroid, price_public, price_per_sotka, price_private, price_per_sotka_private, status, owner_id, comment, created_at, updated_at
        if (parts.length >= 16) {
            const cadastral = parts[2];
            if (cadastral && cadastral !== '\\N' && cadastral.startsWith('39:')) {
                plots.push({
                    id: parseInt(parts[0]),
                    cadastral_number: cadastral,
                    area: parseFloat(parts[5]) || 0,
                    address: parts[6] !== '\\N' ? parts[6] : '',
                    price_public: parts[9] !== '\\N' ? parseInt(parts[9]) : null,
                    status: parts[13],
                    comment: parts[15] !== '\\N' ? parts[15] : null,
                });
            }
        }
    }

    return plots;
}

async function fetchCurrentPlots() {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=cadastral_number,title,price,area_sotok,district,location,is_active,ownership_type,bundle_id&cadastral_number=not.is.null`;

    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });

    const data = await res.json();

    const map = new Map();
    for (const plot of data || []) {
        if (plot.cadastral_number) {
            map.set(plot.cadastral_number, plot);
        }
    }
    return map;
}

async function main() {
    console.log('='.repeat(60));
    console.log('СРАВНЕНИЕ КАДАСТРОВЫХ НОМЕРОВ');
    console.log('dump.sql (старая БД) vs Supabase (текущая БД)');
    console.log('='.repeat(60));
    console.log('');

    // Extract from dump.sql
    console.log('📂 Извлекаем данные из dump.sql...');
    const dumpPlots = extractFromDump();
    console.log(`   Найдено участков: ${dumpPlots.length}`);

    // Fetch from current DB
    console.log('🌐 Загружаем данные из текущей БД (прод)...');
    const currentPlots = await fetchCurrentPlots();
    console.log(`   Найдено участков: ${currentPlots.size}`);
    console.log('');

    // Compare
    const onlyInDump = [];
    const inBoth = [];

    // Stats by ownership type
    const dumpOwnership = { ownership: 0, lease: 0, unknown: 0 };
    const dumpBundles = [];

    for (const plot of dumpPlots) {
        // Analyze ownership from comment
        const comment = plot.comment?.toLowerCase() || '';
        if (comment.includes('аренда')) {
            dumpOwnership.lease++;
        } else if (comment.includes('собственность')) {
            dumpOwnership.ownership++;
        } else {
            dumpOwnership.unknown++;
        }

        // Check for bundles
        if (comment.includes('продается вместе') || comment.includes('единым лотом')) {
            dumpBundles.push(plot.cadastral_number);
        }

        if (currentPlots.has(plot.cadastral_number)) {
            inBoth.push({ dump: plot, current: currentPlots.get(plot.cadastral_number) });
            currentPlots.delete(plot.cadastral_number);
        } else {
            onlyInDump.push(plot);
        }
    }

    // Remaining are only in current
    const onlyInCurrent = Array.from(currentPlots.keys());

    // Print report
    console.log('='.repeat(60));
    console.log('ОТЧЕТ');
    console.log('='.repeat(60));
    console.log('');

    console.log(`📊 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`   Участков в dump.sql:           ${dumpPlots.length}`);
    console.log(`   Участков в текущей БД:         ${currentPlots.size + inBoth.length}`);
    console.log(`   Совпадают (есть в обеих):      ${inBoth.length}`);
    console.log(`   Только в dump.sql:             ${onlyInDump.length}`);
    console.log(`   Только в текущей БД:           ${onlyInCurrent.length}`);
    console.log('');

    console.log(`📋 ВИД ПРАВА (по данным dump.sql):`);
    console.log(`   Собственность:                 ${dumpOwnership.ownership}`);
    console.log(`   Аренда:                        ${dumpOwnership.lease}`);
    console.log(`   Не указано:                    ${dumpOwnership.unknown}`);
    console.log('');

    console.log(`🔗 ПАКЕТЫ (продаются вместе):     ${dumpBundles.length} участков`);
    console.log('');

    if (onlyInDump.length > 0) {
        console.log('='.repeat(60));
        console.log(`❌ УЧАСТКИ ТОЛЬКО В DUMP.SQL (${onlyInDump.length}):`);
        console.log('   (Отсутствуют в текущей БД - можно добавить)');
        console.log('-'.repeat(60));
        for (const plot of onlyInDump.slice(0, 20)) {
            const ownershipType = plot.comment?.toLowerCase().includes('аренда') ? 'Аренда' : 'Собств.';
            console.log(`   ${plot.cadastral_number} | ${plot.area} сот. | ${plot.price_public || 'N/A'} ₽ | ${ownershipType}`);
        }
        if (onlyInDump.length > 20) {
            console.log(`   ... и еще ${onlyInDump.length - 20} участков`);
        }
        console.log('');
    }

    if (onlyInCurrent.length > 0) {
        console.log('='.repeat(60));
        console.log(`➕ УЧАСТКИ ТОЛЬКО В ТЕКУЩЕЙ БД (${onlyInCurrent.length}):`);
        console.log('   (Добавлены после dump.sql)');
        console.log('-'.repeat(60));
        for (const cadastral of onlyInCurrent.slice(0, 20)) {
            console.log(`   ${cadastral}`);
        }
        if (onlyInCurrent.length > 20) {
            console.log(`   ... и еще ${onlyInCurrent.length - 20} участков`);
        }
        console.log('');
    }

    // Save detailed report to file
    const reportPath = path.join(process.cwd(), 'cadastral_comparison_report.json');
    const report = {
        generated_at: new Date().toISOString(),
        summary: {
            total_in_dump: dumpPlots.length,
            total_in_current: currentPlots.size + inBoth.length,
            matching: inBoth.length,
            only_in_dump: onlyInDump.length,
            only_in_current: onlyInCurrent.length,
        },
        ownership_stats: dumpOwnership,
        bundles_count: dumpBundles.length,
        only_in_dump: onlyInDump.map(p => ({
            cadastral: p.cadastral_number,
            area: p.area,
            price: p.price_public,
            comment: p.comment,
        })),
        only_in_current: onlyInCurrent,
        bundles: dumpBundles,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`💾 Детальный отчет сохранен: ${reportPath}`);
}

main().catch(console.error);
