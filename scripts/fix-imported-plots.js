/**
 * Fix imported plots: update locations from dump.sql and fix ownership types
 * Run: node scripts/fix-imported-plots.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

// Load data from dump.sql to get original addresses
function loadDumpData() {
    const dumpPath = path.join(process.cwd(), 'dump.sql');
    const content = fs.readFileSync(dumpPath, 'utf-8');

    const copyMatch = content.match(/COPY public\.plots \([^)]+\) FROM stdin;([\s\S]*?)\\\./);
    if (!copyMatch) {
        console.error('Could not find plots COPY block in dump.sql');
        return new Map();
    }

    const dataBlock = copyMatch[1].trim();
    const lines = dataBlock.split('\n').filter(line => line.trim());

    const plotsMap = new Map();

    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 16) {
            const cadastral = parts[2]?.trim();
            if (cadastral && cadastral !== '\\N' && cadastral.startsWith('39:')) {
                const address = parts[6] !== '\\N' ? parts[6] : '';
                const comment = parts[15] !== '\\N' ? parts[15] : '';

                plotsMap.set(cadastral, {
                    address,
                    comment,
                    isLease: comment?.toLowerCase().includes('аренда'),
                });
            }
        }
    }

    return plotsMap;
}

function extractLocation(address) {
    if (!address) return null;

    const patterns = [
        /п\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,
        /пос\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,
        /посёлок\s+([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,
        /г\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,
        /,\s*п\s+([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,
        /п\s+([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,
    ];

    for (const pattern of patterns) {
        const match = address.match(pattern);
        if (match && match[1] && match[1].length >= 3) {
            return 'пос. ' + match[1];
        }
    }

    return null;
}

function extractDistrict(address) {
    if (!address) return 'Калининградская область';
    if (address.includes('Гурьевский')) return 'Гурьевский городской округ';
    if (address.includes('Зеленоградский')) return 'Зеленоградский район';
    if (address.includes('Гвардейский')) return 'Гвардейский район';
    if (address.includes('Светлогорский')) return 'Светлогорский район';
    if (address.includes('Полесский')) return 'Полесский район';
    if (address.includes('Неманский')) return 'Неманский район';
    if (address.includes('Черняховский')) return 'Черняховский район';
    if (address.includes('Славский')) return 'Славский район';
    if (address.includes('Краснознаменский')) return 'Краснознаменский район';
    if (address.includes('Багратионовский')) return 'Багратионовский район';
    if (address.includes('Правдинский')) return 'Правдинский район';
    if (address.includes('Нестеровский')) return 'Нестеровский район';
    if (address.includes('Озёрский')) return 'Озёрский район';
    return 'Калининградская область';
}

async function fetchRecentPlots() {
    // Get plots added in last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=id,cadastral_number,title,location,district,ownership_type&created_at=gte.${yesterday}`;

    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });

    return await res.json();
}

async function updatePlot(id, updates) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?id=eq.${id}`;

    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        body: JSON.stringify(updates),
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('ИСПРАВЛЕНИЕ ИМПОРТИРОВАННЫХ УЧАСТКОВ');
    console.log('='.repeat(60));
    console.log('');

    console.log('📂 Загрузка данных из dump.sql...');
    const dumpData = loadDumpData();
    console.log(`   Загружено: ${dumpData.size} записей`);

    console.log('🌐 Загрузка недавно добавленных участков...');
    const plots = await fetchRecentPlots();
    console.log(`   Найдено: ${plots.length} участков`);
    console.log('');

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const plot of plots) {
        const dumpInfo = dumpData.get(plot.cadastral_number);

        if (!dumpInfo) {
            skipped++;
            continue;
        }

        const updates = {};

        // Fix location
        const location = extractLocation(dumpInfo.address);
        if (location && plot.location === 'Калининградская область') {
            updates.location = location;
        }

        // Fix district
        const district = extractDistrict(dumpInfo.address);
        if (district && plot.district !== district) {
            updates.district = district;
        }

        // Fix ownership type - only set lease for аренда, null for others
        if (dumpInfo.isLease) {
            if (plot.ownership_type !== 'lease') {
                updates.ownership_type = 'lease';
            }
        } else {
            if (plot.ownership_type === 'ownership') {
                updates.ownership_type = null; // Remove ownership, leave empty
            }
        }

        // Fix title if it contains "Калининградская область"
        if (plot.title && plot.title.includes('Калининградская область') && location) {
            const area = plot.title.match(/(\d+)\s*сот/)?.[1] || '';
            if (area) {
                updates.title = `Участок ${area} сот. ${location}`;
            }
        }

        if (Object.keys(updates).length > 0) {
            try {
                await updatePlot(plot.id, updates);
                updated++;
                console.log(`✅ ${plot.cadastral_number}: ${Object.keys(updates).join(', ')}`);
            } catch (err) {
                errors++;
                console.log(`❌ ${plot.cadastral_number}: ${err.message}`);
            }
        } else {
            skipped++;
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('РЕЗУЛЬТАТ');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено: ${updated}`);
    console.log(`⏭️  Пропущено: ${skipped}`);
    console.log(`❌ Ошибок: ${errors}`);
}

main().catch(console.error);
