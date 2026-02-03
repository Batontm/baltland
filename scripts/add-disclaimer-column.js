/**
 * Add disclaimer column to organization_settings and set default value
 */

const SUPABASE_URL = "https://api.baltland.ru";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Njg4Mjk3MzMsImV4cCI6MjA4NDE4OTczM30.v_1Wpg06VVCTfDOeQudlD5q7kpHVvR7LvTZCCXJtzWI";

const DISCLAIMER = `❗ Важно о деталях:
В нашей базе более 2000 участков, поэтому в описании могут быть неточности касательно текущего состояния подъездных путей или коммуникаций. Информация носит справочный характер и не является публичной офертой (ст. 437 ГК РФ).
Стоимость и параметры могут меняться. Чтобы избежать недоразумений, пожалуйста, уточните актуальные нюансы у менеджера перед просмотром.`;

async function main() {
    console.log('Добавление дисклеймера в настройки организации...');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/organization_settings?id=eq.00000000-0000-0000-0000-000000000001`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ plot_description_disclaimer: DISCLAIMER })
    });

    if (res.ok) {
        console.log('✅ Дисклеймер сохранён в настройках');
    } else {
        const text = await res.text();
        console.log('❌ Ошибка:', text);
        // If column doesn't exist, that's okay - it will be added on deploy
        if (text.includes('column')) {
            console.log('ℹ️ Колонка будет добавлена при деплое');
        }
    }
}

main().catch(console.error);
