const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const convertCoords = (x, y) => {
    const lon = (x * 180) / 20037508.34;
    let lat = (y * 180) / 20037508.34;
    lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
    return [lat, lon];
};

async function syncCoordinates() {
    console.log('--- Начинаю массовую синхронизацию координат ---');

    // 1. Получаем все участки без координат, но с кадастровым номером
    const { data: plots, error } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, title')
        .or('has_coordinates.is.null,has_coordinates.eq.false')
        .not('cadastral_number', 'is', null);

    if (error) {
        console.error('Ошибка получения списка участков:', error);
        return;
    }

    console.log(`Найдено участков для обработки: ${plots.length}`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < plots.length; i++) {
        const plot = plots[i];
        console.log(`[${i + 1}/${plots.length}] Обработка: ${plot.cadastral_number} (${plot.title})`);

        try {
            const url = `https://nspd.gov.ru/api/geoportal/v2/search/geoportal?query=${encodeURIComponent(plot.cadastral_number)}`;
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    "Referer": "https://nspd.gov.ru/map",
                }
            });

            if (!response.ok) {
                console.warn(`  - Ошибка API (${response.status})`);
                failed++;
                continue;
            }

            const resJson = await response.json();
            const feature = resJson.data?.features?.[0];

            if (!feature || !feature.geometry) {
                console.warn(`  - Геометрия не найдена`);
                failed++;
                continue;
            }

            const geometry = feature.geometry;
            let centerLat = null;
            let centerLon = null;

            if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates[0])) {
                const ring = geometry.coordinates[0];
                let sumLat = 0, sumLon = 0, count = 0;
                for (const pt of ring) {
                    const [lat, lon] = convertCoords(pt[0], pt[1]);
                    sumLat += lat;
                    sumLon += lon;
                    count++;
                }
                if (count > 0) {
                    centerLat = sumLat / count;
                    centerLon = sumLon / count;
                }
            } else if (geometry.type === "Point") {
                const [lat, lon] = convertCoords(geometry.coordinates[0], geometry.coordinates[1]);
                centerLat = lat;
                centerLon = lon;
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
                console.error(`  - Ошибка сохранения в базе:`, updateError);
                failed++;
            } else {
                console.log(`  + Координаты успешно сохранены`);
                success++;
            }

        } catch (err) {
            console.error(`  - Исключение:`, err.message);
            failed++;
        }

        // Небольшая задержка, чтобы не забанили
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('--- Синхронизация завершена ---');
    console.log(`Успешно: ${success}`);
    console.log(`Ошибка: ${failed}`);
}

syncCoordinates();
