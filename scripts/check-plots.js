const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function checkPlots() {
    const { data, error } = await supabase
        .from('land_plots')
        .select('location, district, id')
        .order('location');

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Group by location
    const byLocation = {};
    for (const p of data || []) {
        const loc = p.location || 'Без названия';
        if (!byLocation[loc]) byLocation[loc] = [];
        byLocation[loc].push({ id: p.id, district: p.district });
    }

    console.log('=== ЗЕМЕЛЬНЫЕ УЧАСТКИ ПО ПОСЕЛКАМ ===\n');
    console.log('| Поселок | Район | Кол-во |');
    console.log('|---------|-------|--------|');

    for (const [loc, plots] of Object.entries(byLocation)) {
        const districts = [...new Set(plots.map(p => p.district))];
        console.log('| ' + loc + ' | ' + districts.join(', ') + ' | ' + plots.length + ' |');
    }

    console.log('\nВсего поселков с участками: ' + Object.keys(byLocation).length);
    console.log('Всего участков: ' + data.length);
}

checkPlots();
