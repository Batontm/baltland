const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPlots() {
    const cadastralNumbers = [
        '39:03:060012:3698',
        '39:03:060012:3687',
        '39:03:060012:3628'
    ];

    const { data, error } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, has_coordinates, title')
        .in('cadastral_number', cadastralNumbers);

    if (error) {
        console.error('Error fetching plots:', error);
        return;
    }

    console.log('Plots found:', data.length);
    data.forEach(plot => {
        console.log(`- ${plot.cadastral_number}: ${plot.title}, has_coordinates: ${plot.has_coordinates}`);
    });
}

checkPlots();
