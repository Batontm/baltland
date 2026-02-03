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

async function findZeroCoords() {
    console.log("Searching for land plots with zero or NULL coordinates despite has_coordinates=true...\n");

    const { data, error } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, center_lat, center_lon, has_coordinates, title, coordinates_json, bundle_id')
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
        console.log("No issues found! All plots with has_coordinates=true have non-zero coordinates.");
    } else {
        console.log(`Found ${issues.length} plots with suspicious coordinates:\n`);
        issues.forEach(p => {
            const hasGeo = !!p.coordinates_json;
            const isBundle = !!p.bundle_id;
            console.log(`- CN: ${p.cadastral_number} | Lat: ${p.center_lat} | Lon: ${p.center_lon} | GeoJSON: ${hasGeo} | Bundle: ${isBundle} | Title: ${p.title}`);
        });
    }

    process.exit(0);
}

findZeroCoords();
