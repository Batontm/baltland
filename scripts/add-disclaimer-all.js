/**
 * Add disclaimer to ALL plot descriptions
 * Run: node scripts/add-disclaimer-all.js
 */

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

const DISCLAIMER = `

❗ Важно о деталях:
В нашей базе более 2000 участков, поэтому в описании могут быть неточности касательно текущего состояния подъездных путей или коммуникаций. Информация носит справочный характер и не является публичной офертой (ст. 437 ГК РФ).
Стоимость и параметры могут меняться. Чтобы избежать недоразумений, пожалуйста, уточните актуальные нюансы у менеджера перед просмотром.`;

async function fetchAllPlotsWithoutDisclaimer(offset = 0, limit = 500) {
    // Get ALL active plots that don't have disclaimer
    const url = `${SUPABASE_URL}/rest/v1/land_plots?select=id,cadastral_number,description&is_active=eq.true&description=not.is.null&offset=${offset}&limit=${limit}`;

    const res = await fetch(url, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        }
    });

    const data = await res.json();

    // Filter plots that don't have the disclaimer yet
    return data.filter(plot => {
        if (!plot.description) return false;
        return !plot.description.includes('❗ Важно о деталях');
    });
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
    console.log('ДОБАВЛЕНИЕ ДИСКЛЕЙМЕРА КО ВСЕМ УЧАСТКАМ');
    console.log('='.repeat(60));
    console.log('');

    let totalUpdated = 0;
    let offset = 0;
    const batchSize = 500;

    while (true) {
        console.log(`\n🌐 Загрузка участков (offset ${offset})...`);
        const plots = await fetchAllPlotsWithoutDisclaimer(offset, batchSize);

        if (plots.length === 0) {
            console.log('   Больше участков без дисклеймера не найдено');
            break;
        }

        console.log(`   Найдено без дисклеймера: ${plots.length}`);

        for (const plot of plots) {
            const newDescription = plot.description + DISCLAIMER;

            const ok = await updatePlot(plot.id, newDescription);
            if (ok) {
                totalUpdated++;
                if (totalUpdated % 50 === 0) {
                    console.log(`   ... обновлено ${totalUpdated}`);
                }
            }
        }

        offset += batchSize;

        // If we got less than batch size, we're done
        if (plots.length < batchSize) break;
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Всего обновлено: ${totalUpdated}`);
}

main().catch(console.error);
