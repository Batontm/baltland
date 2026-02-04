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

async function finalizeAgriTitles() {
    const targetAgriPlots = [
        "39:08:380003:1",
        "39:05:061002:57",
        "39:03:040005:103",
        "39:03:040005:105",
        "39:03:040005:84",
        "39:05:030620:14",
        "39:11:080906:219",
        "39:11:080901:366",
        "39:10:540003:182",
        "39:05:051109:24",
        "39:03:090805:373",
        "39:03:090805:372",
        "39:03:090805:317"
    ];

    console.log("🛠 Finalizing titles for agricultural plots...");

    for (const cadastral of targetAgriPlots) {
        const { data: plot } = await supabase
            .from('land_plots')
            .select('id, area_sotok, title, location')
            .eq('cadastral_number', cadastral)
            .single();

        if (plot) {
            // New title format: "Участок [AREA] сот. (СХ) [LOCATION]"
            const areaStr = plot.area_sotok.toFixed(2).replace(/\.00$/, "");
            let locationPart = plot.location ? ` ${plot.location}` : "";
            const newTitle = `Участок ${areaStr} сот. (СХ)${locationPart}`;

            console.log(`✅ Updating ${cadastral}: ${plot.title} -> ${newTitle}`);

            await supabase
                .from('land_plots')
                .update({ title: newTitle })
                .eq('id', plot.id);
        }
    }

    // Also catch any plot where title area != numerical area
    console.log("🔍 Checking for any remaining title mismatches...");
    const { data: allPlots } = await supabase.from('land_plots').select('id, area_sotok, title, cadastral_number');

    for (const plot of allPlots || []) {
        // Simple heuristic: if title contains a number matching 100 * area_sotok, it's outdated
        const oldArea = Math.round(plot.area_sotok * 100);
        if (plot.title.includes(oldArea.toString()) && oldArea > 2500) {
            const areaStr = plot.area_sotok.toFixed(2).replace(/\.00$/, "");
            const newTitle = plot.title.replace(oldArea.toString(), areaStr);
            console.log(`⚠️ Mismatch found in ${plot.cadastral_number}: ${plot.title} -> ${newTitle}`);
            await supabase.from('land_plots').update({ title: newTitle }).eq('id', plot.id);
        }
    }

    console.log("🏁 Formatting complete.");
}

finalizeAgriTitles().catch(console.error);
