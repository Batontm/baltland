const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findDuplicates() {
    // Get all settlements (города, поселки)
    const { data: settlements, error } = await supabase
        .from('kladr_places')
        .select('code, name, socr')
        .or('socr.eq.г,socr.eq.п,socr.eq.пос,socr.eq.с,socr.eq.д')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Get districts
    const { data: districts } = await supabase
        .from('kladr_places')
        .select('code, name, socr')
        .or('socr.eq.р-н,socr.eq.г.о.,socr.eq.городской округ,socr.eq.район');

    // Create lookup for district by code prefix
    const districtMap = {};
    for (const d of districts || []) {
        districtMap[d.code.substring(0, 5)] = d.name + ' ' + d.socr;
    }

    // Group settlements by name to find duplicates
    const byName = {};
    for (const s of settlements || []) {
        const fullName = (s.socr ? s.socr + '. ' : '') + s.name;
        if (!byName[fullName]) byName[fullName] = [];

        const districtCode = s.code.substring(0, 5);
        byName[fullName].push({
            code: s.code,
            district: districtMap[districtCode] || 'Неизвестный район',
            districtCode
        });
    }

    // Find duplicates (same name in same district)
    console.log('\n=== ДУБЛИ ПОСЕЛКОВ (одинаковые названия в одном районе) ===\n');
    console.log('| Название | Район | Кол-во | Коды |');
    console.log('|----------|-------|--------|------|');

    let totalDupesInDistrict = 0;
    for (const [name, items] of Object.entries(byName)) {
        // Group by district
        const byDistrict = {};
        for (const item of items) {
            if (!byDistrict[item.district]) byDistrict[item.district] = [];
            byDistrict[item.district].push(item.code);
        }

        for (const [district, codes] of Object.entries(byDistrict)) {
            if (codes.length > 1) {
                totalDupesInDistrict++;
                console.log('| ' + name + ' | ' + district + ' | ' + codes.length + ' | ' + codes.join(', ') + ' |');
            }
        }
    }

    console.log('\nВсего дублей в одном районе: ' + totalDupesInDistrict);

    // Also show settlements with same name in DIFFERENT districts
    console.log('\n\n=== ПОСЕЛКИ С ОДИНАКОВЫМ НАЗВАНИЕМ В РАЗНЫХ РАЙОНАХ ===\n');
    console.log('| Название | Количество районов | Районы |');
    console.log('|----------|-------------------|--------|');

    let sameNameDifferentDistrict = 0;
    for (const [name, items] of Object.entries(byName)) {
        // Get unique districts
        const uniqueDistricts = [...new Set(items.map(i => i.district))];

        if (uniqueDistricts.length > 1) {
            sameNameDifferentDistrict++;
            console.log('| ' + name + ' | ' + uniqueDistricts.length + ' | ' + uniqueDistricts.join('; ') + ' |');
        }
    }

    console.log('\nПоселков с одинаковым названием в разных районах: ' + sameNameDifferentDistrict);
}

findDuplicates();
