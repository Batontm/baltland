/**
 * Fix imported plots: update locations properly from dump.sql
 * Run: node scripts/fix-locations-v2.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

// Load data from dump.sql
function loadDumpData() {
    const dumpPath = path.join(process.cwd(), 'dump.sql');
    const content = fs.readFileSync(dumpPath, 'utf-8');

    const copyMatch = content.match(/COPY public\.plots \([^)]+\) FROM stdin;([\s\S]*?)\\\./);
    if (!copyMatch) {
        console.error('Could not find plots COPY block');
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

// Extract settlement from address like:
// "Российская Федерация, Калининградская область, Гурьевский р-н., п. Поддубное"
// Result: пос. Поддубное
function extractSettlement(address) {
    if (!address) return null;

    // Split by comma and find settlement in last parts
    const parts = address.split(',').map(s => s.trim());

    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];

        // Match patterns like: п. Синявино, пос. Рыбное, пгт. Янтарный
        const patterns = [
            /^п\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]+)/i,
            /^пос\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]+)/i,
            /^пгт\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]+)/i,
            /^г\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]+)/i,
            /^(?:п|пос|пгт)\s+([А-Яа-яЁё][А-Яа-яЁё\-]+)/i,
        ];

        for (const pattern of patterns) {
            const match = part.match(pattern);
            if (match && match[1] && match[1].length >= 3) {
                return 'пос. ' + match[1];
            }
        }
    }

    return null;
}

// Extract district from address
function extractDistrict(address) {
    if (!address) return null;

    const districtMap = {
        'Гурьевский': 'Гурьевский городской округ',
        'Зеленоградский': 'Зеленоградский район',
        'Гвардейский': 'Гвардейский район',
        'Светлогорский': 'Светлогорский район',
        'Полесский': 'Полесский район',
        'Неманский': 'Неманский район',
        'Черняховский': 'Черняховский район',
        'Славский': 'Славский район',
        'Краснознаменский': 'Краснознаменский район',
        'Багратионовский': 'Багратионовский район',
        'Правдинский': 'Правдинский район',
        'Нестеровский': 'Нестеровский район',
        'Озёрский': 'Озёрский район',
        'Балтийский': 'Балтийский район',
        'Янтарный': 'Янтарный городской округ',
        'Светлый': 'Светлый городской округ',
        'Пионерский': 'Пионерский городской округ',
    };

    for (const [key, value] of Object.entries(districtMap)) {
        if (address.includes(key)) {
            return value;
        }
    }

    return null;
}

async function fetchRecentPlots() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=id,cadastral_number,title,location,district&created_at=gte.${yesterday}`;

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
        },
        body: JSON.stringify(updates),
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('ИСПРАВЛЕНИЕ ЛОКАЦИЙ ИМПОРТИРОВАННЫХ УЧАСТКОВ');
    console.log('='.repeat(60));
    console.log('');

    console.log('📂 Загрузка данных из dump.sql...');
    const dumpData = loadDumpData();
    console.log(`   Загружено: ${dumpData.size} записей`);

    console.log('🌐 Загрузка недавних участков...');
    const plots = await fetchRecentPlots();
    console.log(`   Найдено: ${plots.length} участков`);
    console.log('');

    let updated = 0;
    let skipped = 0;

    for (const plot of plots) {
        const dumpInfo = dumpData.get(plot.cadastral_number);

        if (!dumpInfo || !dumpInfo.address) {
            skipped++;
            continue;
        }

        const settlement = extractSettlement(dumpInfo.address);
        const district = extractDistrict(dumpInfo.address);

        if (!settlement) {
            console.log(`⚠️  ${plot.cadastral_number}: не удалось извлечь посёлок из "${dumpInfo.address}"`);
            skipped++;
            continue;
        }

        const updates = {
            location: settlement,
            district: district || plot.district,
        };

        // Update title to use settlement name
        const areaMatch = plot.title?.match(/(\d+)\s*сот/);
        if (areaMatch) {
            updates.title = `Участок ${areaMatch[1]} сот. ${settlement}`;
        }

        try {
            await updatePlot(plot.id, updates);
            updated++;
            console.log(`✅ ${plot.cadastral_number}: ${settlement}, ${district || 'район не определён'}`);
        } catch (err) {
            console.log(`❌ ${plot.cadastral_number}: ${err.message}`);
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено: ${updated}`);
    console.log(`⏭️  Пропущено: ${skipped}`);
}

main().catch(console.error);
