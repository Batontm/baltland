/**
 * Extract geometry from dump.sql and update plots + generate images
 * Run: node scripts/sync-geometry-from-dump.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

// Parse WKB Polygon to GeoJSON
function parseWKBPolygon(hex) {
    if (!hex || hex.length < 50) return null;

    try {
        // WKB format:
        // 01 - little endian
        // 03000020 - Polygon with SRID
        // E6100000 - SRID 4326
        // 01000000 - 1 ring
        // 05000000 - 5 points (closed polygon)
        // Then pairs of 8-byte doubles (lon, lat)

        // Skip header (18 chars = 9 bytes for type+SRID)
        let offset = 18;

        // Read number of rings (4 bytes = 8 hex chars)
        const numRings = parseInt(hex.substr(offset, 8).match(/../g).reverse().join(''), 16);
        offset += 8;

        const rings = [];

        for (let r = 0; r < numRings; r++) {
            // Read number of points (4 bytes)
            const numPoints = parseInt(hex.substr(offset, 8).match(/../g).reverse().join(''), 16);
            offset += 8;

            const ring = [];

            for (let p = 0; p < numPoints; p++) {
                // Read X (lon) - 8 bytes double
                const xHex = hex.substr(offset, 16);
                offset += 16;

                // Read Y (lat) - 8 bytes double  
                const yHex = hex.substr(offset, 16);
                offset += 16;

                const lon = hexToDouble(xHex);
                const lat = hexToDouble(yHex);

                if (lon && lat && lat > 50 && lat < 60 && lon > 15 && lon < 25) {
                    ring.push([lon, lat]);
                }
            }

            if (ring.length >= 3) {
                rings.push(ring);
            }
        }

        if (rings.length > 0 && rings[0].length >= 3) {
            return {
                type: "Polygon",
                coordinates: rings
            };
        }
    } catch (e) {
        // console.error('WKB parse error:', e.message);
    }

    return null;
}

function hexToDouble(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    bytes.forEach((b, i) => view.setUint8(i, b));
    return view.getFloat64(0, true);
}

// Load geometry from dump.sql
function loadGeometryFromDump() {
    const dumpPath = path.join(process.cwd(), 'dump.sql');
    const content = fs.readFileSync(dumpPath, 'utf-8');

    const copyMatch = content.match(/COPY public\.plots \([^)]+\) FROM stdin;([\s\S]*?)\\\./);
    if (!copyMatch) {
        console.error('Could not find plots COPY block');
        return new Map();
    }

    const dataBlock = copyMatch[1].trim();
    const lines = dataBlock.split('\n').filter(line => line.trim());

    const geometryMap = new Map();

    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 9) {
            const cadastral = parts[2]?.trim();
            const geometryHex = parts[7] !== '\\N' ? parts[7] : null;

            if (cadastral && cadastral.startsWith('39:') && geometryHex) {
                const geojson = parseWKBPolygon(geometryHex);
                if (geojson) {
                    geometryMap.set(cadastral, geojson);
                }
            }
        }
    }

    return geometryMap;
}

async function fetchPlotsWithoutGeometry() {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=id,cadastral_number&coordinates_json=is.null&cadastral_number=not.is.null&is_active=eq.true&limit=300`;

    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });

    return await res.json();
}

async function updatePlotGeometry(id, geometry) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?id=eq.${id}`;

    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            coordinates_json: geometry,
            has_coordinates: true,
            updated_at: new Date().toISOString(),
        }),
    });

    return res.ok;
}

async function main() {
    console.log('='.repeat(60));
    console.log('СИНХРОНИЗАЦИЯ ГЕОМЕТРИИ ИЗ DUMP.SQL');
    console.log('='.repeat(60));
    console.log('');

    console.log('📂 Извлечение геометрии из dump.sql...');
    const geometryMap = loadGeometryFromDump();
    console.log(`   Найдено участков с геометрией: ${geometryMap.size}`);

    console.log('🌐 Загрузка участков без геометрии...');
    const plots = await fetchPlotsWithoutGeometry();
    console.log(`   Найдено: ${plots.length}`);
    console.log('');

    let updated = 0;
    let notFound = 0;

    for (const plot of plots) {
        const geometry = geometryMap.get(plot.cadastral_number);

        if (geometry) {
            const ok = await updatePlotGeometry(plot.id, geometry);
            if (ok) {
                updated++;
                console.log(`✅ ${plot.cadastral_number}`);
            }
        } else {
            notFound++;
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено геометрией: ${updated}`);
    console.log(`⚠️ Геометрия не найдена в дампе: ${notFound}`);
    console.log('');
    console.log('Теперь запустите генерацию карт:');
    console.log('  npx tsx scripts/generate-plot-images.ts');
}

main().catch(console.error);
