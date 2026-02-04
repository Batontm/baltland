import { createClient } from "@supabase/supabase-js"
import * as path from 'path'
import * as fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env: Record<string, string> = {}
envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const [key, ...vals] = trimmed.split('=')
    env[key.trim()] = vals.join('=').trim().replace(/^["'](.*)["']$/, '$1')
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)

async function generateReport() {
    const { data: plots } = await supabase
        .from('land_plots')
        .select('location, bundle_id, is_bundle_primary, price')
        .not('location', 'is', null);

    if (!plots) return;

    const bundleGroups: Record<string, any[]> = {};
    for (const p of plots) {
        if (p.bundle_id) {
            if (!bundleGroups[p.bundle_id]) bundleGroups[p.bundle_id] = [];
            bundleGroups[p.bundle_id].push(p);
        }
    }

    const locationStats: Record<string, { lots: number, plots: number, min: number, max: number }> = {};

    for (const bid in bundleGroups) {
        const group = bundleGroups[bid];
        const loc = group[0].location;
        if (!locationStats[loc]) locationStats[loc] = { lots: 0, plots: 0, min: Infinity, max: 0 };

        locationStats[loc].lots += 1;
        locationStats[loc].plots += group.length;

        const primary = group.find(p => p.is_bundle_primary);
        const price = (primary && primary.price > 0) ? primary.price : group.reduce((acc, p) => acc + (p.price || 0), 0);

        if (price > 0) {
            locationStats[loc].min = Math.min(locationStats[loc].min, price);
            locationStats[loc].max = Math.max(locationStats[loc].max, price);
        }
    }

    const results = Object.entries(locationStats).map(([loc, stat]) => ({
        loc,
        lots: stat.lots,
        plots: stat.plots,
        range: stat.min === Infinity ? "Нет цен" : (stat.min === stat.max ? `${stat.min.toLocaleString('ru-RU')} ₽` : `${stat.min.toLocaleString('ru-RU')} - ${stat.max.toLocaleString('ru-RU')} ₽`)
    })).sort((a, b) => b.lots - a.lots);

    let md = "# Отчет по лотам (участкам, продаваемым вместе)\n\n";
    md += "Дата обновления: " + new Date().toLocaleDateString('ru-RU') + "\n\n";
    md += "| Поселок | Кол-во лотов | Участков в лотах | Диапазон цен за лот |\n";
    md += "| :--- | :---: | :---: | :--- |\n";
    for (const r of results) {
        md += `| **${r.loc}** | ${r.lots} | ${r.plots} | ${r.range} |\n`;
    }

    fs.writeFileSync('bundled_plots_report.md', md);
    console.log("✅ Report updated in bundled_plots_report.md");
}

generateReport().catch(console.error);
