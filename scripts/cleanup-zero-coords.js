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

async function cleanupZeroCoords() {
    console.log("Identifying land plots with zero coordinates for cleanup...\n");

    const { data, error } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, center_lat, center_lon, has_coordinates, title')
        .eq('has_coordinates', true);

    if (error) {
        console.error('Error fetching plots:', error);
        return;
    }

    const issues = (data || []).filter(p => {
        const lat = Number(p.center_lat);
        const lon = Number(p.center_lon);
        return lat === 0 || lon === 0 || p.center_lat === null || p.center_lon === null;
    });

    if (issues.length === 0) {
        console.log("No plots with zero coordinates found. Nothing to cleanup.");
        process.exit(0);
    }

    console.log(`Found ${issues.length} plots to fix. Starting cleanup...\n`);

    for (const p of issues) {
        process.stdout.write(`Fixing ${p.cadastral_number}... `);
        const { error: updateError } = await supabase
            .from('land_plots')
            .update({
                center_lat: null,
                center_lon: null,
                has_coordinates: false,
                has_contour: false,
                coordinates_json: null,
                geometry_type: null,
                sync_error: 'Координаты 0,0 признаны невалидными и сброшены',
                updated_at: new Date().toISOString()
            })
            .eq('id', p.id);

        if (updateError) {
            console.log(`❌ Ошибка: ${updateError.message}`);
        } else {
            console.log("✅ Готово");
        }
    }

    console.log("\nCleanup completed.");
    process.exit(0);
}

cleanupZeroCoords();
