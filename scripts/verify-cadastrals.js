const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const cadastralsToCheck = [
    '39:03:040036:328',
    '39:03:040036:331',
    '39:03:040011:823',
    '39:03:060007:1522',
    '39:03:060007:1521',
    '39:03:060012:2067',
    '39:03:060018:447',
    '39:03:080911:129',
    '39:03:091007:862',
    '39:05:061115:314',
    '39:03:060008:417',
    '39:03:060008:428',
    '39:03:060008:439',
    '39:03:060008:380',
    '39:03:060008:381',
    '39:03:060008:382',
    '39:03:060007:602'
];

async function verifyCadastrals() {
    console.log(`Checking ${cadastralsToCheck.length} plots...\n`);

    // Check main cadastral number and additional_cadastral_numbers (if exists)
    const { data: firstRow, error: schemaError } = await supabase
        .from('land_plots')
        .select('*')
        .limit(1)
        .single();

    if (schemaError && schemaError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Schema error:', schemaError);
    }

    const columns = firstRow ? Object.keys(firstRow) : [];
    const hasAdditional = columns.includes('additional_cadastral_numbers');

    console.log('Available columns:', columns.join(', '));
    console.log('Has additional_cadastral_numbers:', hasAdditional);

    const selectFields = ['cadastral_number', 'title', 'location', 'is_active'];
    if (hasAdditional) selectFields.push('additional_cadastral_numbers');

    const { data: allPlots, error } = await supabase
        .from('land_plots')
        .select(selectFields.join(','));

    if (error) {
        console.error('Error querying database:', error);
        return;
    }

    const results = cadastralsToCheck.map(cad => {
        const found = allPlots.find(p =>
            p.cadastral_number === cad ||
            (p.additional_cadastral_numbers && p.additional_cadastral_numbers.includes(cad))
        );
        return { cad, found };
    });

    const foundInDb = results.filter(r => r.found);
    const missingCadastrals = results.filter(r => !r.found);

    console.log('=== РЕЗУЛЬТАТЫ ПРОВЕРКИ ===\n');

    if (foundInDb.length > 0) {
        console.log('НАЙДЕНЫ В БАЗЕ:');
        foundInDb.forEach(r => {
            const p = r.found;
            const isAdditional = p.cadastral_number !== r.cad;
            console.log(`✅ ${r.cad} | ${p.title || 'Без названия'} | ${p.location || 'Нет локации'} | ${p.is_active ? 'Активен' : 'В архиве'} ${isAdditional ? '(как доп. номер)' : ''}`);
        });
    } else {
        console.log('Ни один из указанных участков не найден в базе.');
    }

    if (missingCadastrals.length > 0) {
        console.log('\nОТСУТСТВУЮТ В БАЗЕ:');
        missingCadastrals.forEach(r => {
            console.log(`❌ ${r.cad}`);
        });
    }

    process.exit(0);
}

verifyCadastrals();
