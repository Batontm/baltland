const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2];
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncPlots(cadastralNumbers) {
    console.log(`--- Начинаю синхронизацию для 3 участков ---`);

    const { data: plots } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, title')
        .in('cadastral_number', cadastralNumbers);

    for (const plot of plots) {
        console.log(`\nОбработка: ${plot.cadastral_number} (${plot.title})`);

        try {
            const url = `https://nspd.gov.ru/api/geoportal/v2/search/geoportal?query=${encodeURIComponent(plot.cadastral_number)}`;
            console.log(`  - Запрос к ${url}`);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://nspd.gov.ru/map",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Origin": "https://nspd.gov.ru",
                }
            });

            console.log(`  - Ответ получен: status=${response.status}`);

            if (!response.ok) {
                console.log(`  - Ошибка API: ${response.statusText}`);
                continue;
            }

            const resJson = await response.json();
            const feature = resJson.data?.features?.[0];

            if (!feature?.geometry) {
                console.log(`  - Геометрия не найдена в ответе`);
                continue;
            }

            const geometry = feature.geometry;

            // Simplified center calculation
            let centerLat = null, centerLon = null;
            const convertCoords = (x, y) => {
                const lon = (x * 180) / 20037508.34;
                let lat = (y * 180) / 20037508.34;
                lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
                return [lat, lon];
            };

            if (geometry.type === "Polygon") {
                const pt = geometry.coordinates[0][0];
                const [lat, lon] = convertCoords(pt[0], pt[1]);
                centerLat = lat; centerLon = lon;
            } else if (geometry.type === "Point") {
                const [lat, lon] = convertCoords(geometry.coordinates[0], geometry.coordinates[1]);
                centerLat = lat; centerLon = lon;
            }

            const { error: updateError } = await supabase
                .from('land_plots')
                .update({
                    coordinates_json: geometry,
                    has_coordinates: true,
                    center_lat: centerLat,
                    center_lon: centerLon,
                    updated_at: new Date().toISOString()
                })
                .eq('id', plot.id);

            if (updateError) {
                console.log(`  - Ошибка сохранения: ${updateError.message}`);
            } else {
                console.log(`  + Успешно сохранено!`);
            }

        } catch (err) {
            console.log(`  - Ошибка: ${err.message}`);
            if (err.cause) console.log(`    Причина: ${err.cause.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

syncPlots(['39:03:060012:3698', '39:03:060012:3687', '39:03:060012:3628']);
