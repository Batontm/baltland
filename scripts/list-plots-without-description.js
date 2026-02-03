const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    const { data, error } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, location, district, description, is_hidden')
        .or('description.is.null,description.eq.')
        .eq('is_hidden', false)
        .order('location');

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Group by location
    const grouped = {};
    for (const plot of data) {
        const loc = plot.location || plot.district || 'Без локации';
        if (!grouped[loc]) grouped[loc] = [];
        grouped[loc].push(plot.cadastral_number || plot.id);
    }

    console.log('\n=== Участки без описания по посёлкам ===\n');
    let total = 0;
    const sorted = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
    for (const [location, plots] of sorted) {
        console.log(`📍 ${location}: ${plots.length} участков`);
        total += plots.length;
    }
    console.log(`\n📊 Всего участков без описания: ${total}`);
}

main();
