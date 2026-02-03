/**
 * Extract missing plots from dump.sql and generate unique descriptions
 * Run: node scripts/extract-missing-plots.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

// ============== DESCRIPTION TEMPLATES ==============
const INTRO_VARIANTS = [
    "🌿 Привлекательный земельный участок площадью {area} соток",
    "🏡 Отличный участок площадью {area} соток для строительства",
    "🌳 Выгодное предложение — участок {area} соток",
    "✨ Перспективный земельный участок площадью {area} соток",
    "🌲 Участок площадью {area} соток в живописном месте",
    "🏠 Земельный участок {area} соток — идеальный выбор",
    "🌾 Прекрасный участок площадью {area} соток",
    "🍀 Удачное вложение — участок {area} соток",
];

const LOCATION_VARIANTS = [
    "расположен в {location}, {district}.",
    "находится в {location}, {district}.",
    "в {location} ({district}).",
    "в живописном {location}, {district}.",
    "в {location}, входящем в состав {district}.",
];

const OWNERSHIP_VARIANTS = {
    ownership: [
        "Право собственности оформлено.",
        "Участок в собственности, документы готовы.",
        "Собственность с полным пакетом документов.",
        "Оформлена собственность.",
        "Чистая собственность.",
    ],
    lease: [
        "Участок в аренде{lease_info}.",
        "Долгосрочная аренда{lease_info}.",
        "Право аренды{lease_info}.",
    ],
};

const FEATURE_VARIANTS = [
    "Удобная транспортная доступность — рядом асфальтированная дорога.",
    "Ровный рельеф, удобный для строительства.",
    "Развитая инфраструктура поблизости.",
    "Тихое и спокойное место вдали от городской суеты.",
    "Чистый воздух и красивая природа вокруг.",
    "До Калининграда — комфортное расстояние.",
    "Электричество по границе участка.",
    "Газ проходит по улице.",
    "Рядом водоём.",
    "Соседние участки застроены.",
    "Живописные виды на окрестности.",
    "Подходит для ИЖС.",
    "Идеален для загородного дома.",
    "Отличный вариант для инвестиций.",
];

const CLOSING_VARIANTS = [
    "📞 Звоните, расскажем подробнее!",
    "📲 Свяжитесь с нами для просмотра.",
    "☎️ Ждём вашего звонка!",
    "🤝 Готовы показать участок.",
    "📱 Консультация бесплатно.",
    "💼 Поможем с оформлением.",
];

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateDescription(plot) {
    const area = Math.round(plot.area);
    const location = extractLocation(plot.address);
    const district = extractDistrict(plot.address);
    const ownershipType = plot.comment?.toLowerCase().includes('аренда') ? 'lease' : 'ownership';
    const leaseInfo = extractLeaseInfo(plot.comment);

    let parts = [];

    // Intro
    parts.push(random(INTRO_VARIANTS).replace('{area}', area));

    // Location
    if (location && district) {
        parts.push(random(LOCATION_VARIANTS)
            .replace('{location}', location)
            .replace('{district}', district));
    }

    // Ownership
    const ownershipVariants = OWNERSHIP_VARIANTS[ownershipType];
    let ownershipText = random(ownershipVariants);
    if (ownershipType === 'lease') {
        ownershipText = ownershipText.replace('{lease_info}', leaseInfo ? ` (${leaseInfo})` : '');
    }
    parts.push(ownershipText);

    // Features (2-4 random)
    const shuffled = [...FEATURE_VARIANTS].sort(() => Math.random() - 0.5);
    const featureCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < featureCount && i < shuffled.length; i++) {
        parts.push(shuffled[i]);
    }

    // Price mention
    if (plot.price && plot.price > 0) {
        const pricePerSotka = Math.round(plot.price / area);
        parts.push(`💰 Цена: ${plot.price.toLocaleString('ru-RU')} ₽ (${pricePerSotka.toLocaleString('ru-RU')} ₽/сотка).`);
    }

    // Closing
    parts.push(random(CLOSING_VARIANTS));

    return parts.join(' ');
}

function extractLocation(address) {
    if (!address) return null;

    // Try different patterns to extract settlement name
    const patterns = [
        /п\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,      // п. Рыбное
        /пос\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,    // пос. Матросово
        /посёлок\s+([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,  // посёлок Авангардное
        /г\.\s*([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,      // г. Гурьевск
        /,\s*п\s+([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,    // , п Голубево
        /п\s+([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i,        // п Поддубное
    ];

    for (const pattern of patterns) {
        const match = address.match(pattern);
        if (match && match[1] && match[1].length >= 3) {
            return 'пос. ' + match[1];
        }
    }

    // Fallback: extract from comma-separated parts
    const parts = address.split(',').map(s => s.trim());
    for (const part of parts) {
        const locMatch = part.match(/(?:п\.|пос\.|п\s)([А-Яа-яЁё][А-Яа-яЁё\-]{2,})/i);
        if (locMatch && locMatch[1]) {
            return 'пос. ' + locMatch[1];
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

function extractLeaseInfo(comment) {
    if (!comment) return null;
    const match = comment.match(/до\s*(\d{4})/i);
    if (match) return `до ${match[1]} года`;
    return null;
}

function parseWKBPoint(hex) {
    // Simple WKB point parser (Little Endian)
    // Format: 0101000020E6100000 + 8 bytes X + 8 bytes Y
    if (!hex || hex.length < 42) return null;

    try {
        // Skip header (18 chars = 9 bytes for SRID variant)
        const coordsHex = hex.substring(18);

        // Read X (lon) and Y (lat) as little-endian doubles
        const xHex = coordsHex.substring(0, 16);
        const yHex = coordsHex.substring(16, 32);

        const lon = hexToDouble(xHex);
        const lat = hexToDouble(yHex);

        if (lat && lon && lat > 50 && lat < 60 && lon > 15 && lon < 25) {
            return { lat, lon };
        }
    } catch (e) {
        console.error('Error parsing WKB:', e.message);
    }
    return null;
}

function hexToDouble(hex) {
    // Convert hex string to little-endian double
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    bytes.forEach((b, i) => view.setUint8(i, b));
    return view.getFloat64(0, true); // little-endian
}

function extractFromDump() {
    const dumpPath = path.join(process.cwd(), 'dump.sql');
    const content = fs.readFileSync(dumpPath, 'utf-8');

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
        if (parts.length >= 16) {
            const cadastral = parts[2];
            if (cadastral && cadastral !== '\\N' && cadastral.startsWith('39:')) {
                const centroidHex = parts[8] !== '\\N' ? parts[8] : null;
                const coords = centroidHex ? parseWKBPoint(centroidHex) : null;

                plots.push({
                    cadastral_number: cadastral.trim(),
                    area: parseFloat(parts[5]) || 0,
                    address: parts[6] !== '\\N' ? parts[6] : '',
                    price: parts[9] !== '\\N' ? parseInt(parts[9]) : null,
                    status: parts[13],
                    comment: parts[15] !== '\\N' ? parts[15] : null,
                    center_lat: coords?.lat || null,
                    center_lon: coords?.lon || null,
                });
            }
        }
    }

    return plots;
}

async function fetchCurrentCadastrals() {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=cadastral_number&cadastral_number=not.is.null`;

    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });

    const data = await res.json();
    return new Set((data || []).map(p => p.cadastral_number));
}

async function main() {
    console.log('='.repeat(60));
    console.log('ИЗВЛЕЧЕНИЕ НЕДОСТАЮЩИХ УЧАСТКОВ С УНИКАЛЬНЫМИ ОПИСАНИЯМИ');
    console.log('='.repeat(60));
    console.log('');

    console.log('📂 Извлечение данных из dump.sql...');
    const dumpPlots = extractFromDump();
    console.log(`   Найдено в dump.sql: ${dumpPlots.length}`);

    console.log('🌐 Загрузка кадастровых номеров из текущей БД...');
    const currentCadastrals = await fetchCurrentCadastrals();
    console.log(`   Найдено в текущей БД: ${currentCadastrals.size}`);

    // Filter missing plots
    const missingPlots = dumpPlots.filter(p => !currentCadastrals.has(p.cadastral_number));
    console.log(`\n📋 Недостающих участков: ${missingPlots.length}`);

    // Generate import data with descriptions
    console.log('\n✍️ Генерация уникальных описаний...');

    const importData = missingPlots.map(plot => {
        const ownershipType = plot.comment?.toLowerCase().includes('аренда') ? 'lease' : 'ownership';
        const location = extractLocation(plot.address) || 'Калининградская область';
        const district = extractDistrict(plot.address);
        const area = Math.round(plot.area);

        return {
            cadastral_number: plot.cadastral_number,
            title: `Участок ${area} сот. ${location}`,
            description: generateDescription(plot),
            price: plot.price || 0,
            area_sotok: area,
            district: district,
            location: location,
            land_status: 'ИЖС', // Default, can be adjusted
            ownership_type: ownershipType,
            center_lat: plot.center_lat,
            center_lon: plot.center_lon,
            has_coordinates: plot.center_lat !== null,
            is_active: true,
            is_featured: false,
        };
    });

    // Save to JSON file
    const outputPath = path.join(process.cwd(), 'missing_plots_for_import.json');
    fs.writeFileSync(outputPath, JSON.stringify(importData, null, 2), 'utf-8');

    console.log(`\n💾 Сохранено: ${outputPath}`);
    console.log(`   Участков для импорта: ${importData.length}`);
    console.log(`   С координатами: ${importData.filter(p => p.has_coordinates).length}`);

    // Show sample
    console.log('\n📝 ПРИМЕР СГЕНЕРИРОВАННОГО ОПИСАНИЯ:');
    console.log('-'.repeat(60));
    if (importData.length > 0) {
        const sample = importData[0];
        console.log(`Участок: ${sample.cadastral_number}`);
        console.log(`Title: ${sample.title}`);
        console.log(`Description:\n${sample.description}`);
    }
}

main().catch(console.error);
