/**
 * Update descriptions to structured format
 * Run: node scripts/update-descriptions-format.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

// Description intro variants
const INTRO_VARIANTS = [
    "🌳 Участок {area} сот. — отличный выбор для строительства дома!",
    "🏡 Участок {area} сот. — прекрасное место для загородного дома!",
    "🌲 Участок {area} сот. — идеальный вариант для вашей мечты!",
    "✨ Участок {area} сот. — выгодное предложение!",
    "🌿 Участок {area} сот. — ваш будущий дом начинается здесь!",
    "🏠 Участок {area} сот. — инвестируйте в своё будущее!",
];

// Description body variants
const DESCRIPTION_VARIANTS = [
    "Спокойный район с чистым воздухом 🌲. Участок правильной формы. Удобный подъезд.",
    "Живописное место с красивыми видами 🌳. Ровный рельеф, удобный для строительства.",
    "Тихое место вдали от городской суеты 🏡. Хорошая транспортная доступность.",
    "Экологически чистый район 🌿. Соседние участки уже застроены.",
    "Перспективный район для проживания 🌲. Развивающаяся инфраструктура.",
    "Уютное место для семейного дома 🏠. Близость к природе.",
];

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateStructuredDescription(plot) {
    const area = plot.area_sotok || 0;
    const location = plot.location || 'Калининградская область';
    const hasGas = plot.has_gas;
    const hasElectricity = plot.has_electricity;
    const hasWater = plot.has_water;

    // Build sections
    let sections = [];

    // 1. Intro
    sections.push(random(INTRO_VARIANTS).replace('{area}', area));

    // 2. Location
    sections.push(`📍 Район: ${location}`);

    // 3. Communications
    let comms = [];
    comms.push('🛠 Коммуникации:');

    if (hasElectricity) {
        comms.push('✅ Электричество: есть/по границе участка ⚡');
    } else {
        comms.push('⚡ Электричество: возможно подключение');
    }

    if (hasGas) {
        comms.push('✅ Газ: есть/по границе 🔥');
    } else {
        comms.push('🏠 Газ: планируется газификация 🔥');
    }

    if (hasWater) {
        comms.push('✅ Вода: центральное водоснабжение 💧');
    } else {
        comms.push('💧 Вода: скважина/колодец');
    }

    sections.push(comms.join('\n'));

    // 4. Description
    sections.push('🌿 Описание:');
    sections.push(random(DESCRIPTION_VARIANTS));

    // 5. Contact
    sections.push('📞 Звоните — ответим на все вопросы!');

    return sections.join('\n\n');
}

async function fetchRecentPlots() {
    // Get plots added recently that have the old description format
    const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=id,cadastral_number,area_sotok,location,district,has_gas,has_electricity,has_water,description&created_at=gte.${yesterday}&is_active=eq.true&limit=300`;

    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });

    const data = await res.json();

    // Filter plots with old-style description (single block of text without sections)
    return data.filter(plot => {
        if (!plot.description) return true;
        // Old format doesn't have section headers like "🛠 Коммуникации:"
        return !plot.description.includes('🛠 Коммуникации:') &&
            !plot.description.includes('🌿 Описание:');
    });
}

async function updatePlot(id, description) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?id=eq.${id}`;

    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
    });

    return res.ok;
}

async function main() {
    console.log('='.repeat(60));
    console.log('ОБНОВЛЕНИЕ ОПИСАНИЙ В СТРУКТУРИРОВАННЫЙ ФОРМАТ');
    console.log('='.repeat(60));
    console.log('');

    console.log('🌐 Загрузка участков с устаревшим форматом описания...');
    const plots = await fetchRecentPlots();
    console.log(`   Найдено: ${plots.length}`);
    console.log('');

    let updated = 0;
    let errors = 0;

    for (const plot of plots) {
        const newDescription = generateStructuredDescription(plot);

        const ok = await updatePlot(plot.id, newDescription);
        if (ok) {
            updated++;
            console.log(`✅ ${plot.cadastral_number || plot.id}`);
        } else {
            errors++;
            console.log(`❌ ${plot.cadastral_number || plot.id}`);
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено: ${updated}`);
    console.log(`❌ Ошибок: ${errors}`);

    // Show sample
    if (plots.length > 0) {
        console.log('');
        console.log('📝 ПРИМЕР НОВОГО ОПИСАНИЯ:');
        console.log('-'.repeat(60));
        console.log(generateStructuredDescription(plots[0]));
    }
}

main().catch(console.error);
