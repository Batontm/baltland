/**
 * Add disclaimer to ALL 2000+ plots - proper pagination
 * Run: node scripts/add-disclaimer-final.js
 */

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

const DISCLAIMER = `

❗ Важно о деталях:
В нашей базе более 2000 участков, поэтому в описании могут быть неточности касательно текущего состояния подъездных путей или коммуникаций. Информация носит справочный характер и не является публичной офертой (ст. 437 ГК РФ).
Стоимость и параметры могут меняться. Чтобы избежать недоразумений, пожалуйста, уточните актуальные нюансы у менеджера перед просмотром.`;

async function getTotalCount() {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=id&is_active=eq.true&description=not.is.null`;
    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Prefer": "count=exact",
            "Range": "0-0"
        }
    });
    const range = res.headers.get('content-range');
    const total = range ? parseInt(range.split('/')[1]) : 0;
    return total;
}

async function fetchPlotsChunk(offset, limit) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=id,cadastral_number,description&is_active=eq.true&description=not.is.null&order=id&offset=${offset}&limit=${limit}`;

    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });

    return await res.json();
}

async function updatePlot(id, description) {
    const url = `${SUPABASE_URL}/rest/v1/land_plots?id=eq.${id}`;

    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
    });

    return res.ok;
}

async function main() {
    console.log('='.repeat(60));
    console.log('ДОБАВЛЕНИЕ ДИСКЛЕЙМЕРА КО ВСЕМ 2000+ УЧАСТКАМ');
    console.log('='.repeat(60));
    console.log('');

    const total = await getTotalCount();
    console.log(`📊 Всего участков с описанием: ${total}`);
    console.log('');

    let totalUpdated = 0;
    let totalSkipped = 0;
    let offset = 0;
    const batchSize = 500;

    while (offset < total) {
        console.log(`\n🌐 Обработка ${offset + 1}-${Math.min(offset + batchSize, total)} из ${total}...`);

        const plots = await fetchPlotsChunk(offset, batchSize);

        if (!plots || plots.length === 0) break;

        for (const plot of plots) {
            // Skip if already has disclaimer
            if (plot.description && plot.description.includes('❗ Важно о деталях')) {
                totalSkipped++;
                continue;
            }

            const newDescription = (plot.description || '') + DISCLAIMER;
            const ok = await updatePlot(plot.id, newDescription);

            if (ok) {
                totalUpdated++;
                if (totalUpdated % 100 === 0) {
                    console.log(`   ✅ Обновлено: ${totalUpdated}`);
                }
            }
        }

        offset += batchSize;
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено: ${totalUpdated}`);
    console.log(`⏭️ Уже имели дисклеймер: ${totalSkipped}`);
    console.log(`📊 Всего обработано: ${totalUpdated + totalSkipped}`);
}

main().catch(console.error);
