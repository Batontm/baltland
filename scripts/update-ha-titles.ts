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

async function updateHaTitles() {
    console.log("🔍 Fetching plots with area >= 100 sotok...");

    const { data: plots, error } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, area_sotok, title, location')
        .gte('area_sotok', 100);

    if (error) {
        console.error("Error fetching plots:", error.message);
        return;
    }

    if (!plots || plots.length === 0) {
        console.log("No plots found with area >= 100.");
        return;
    }

    console.log(`📊 Found ${plots.length} plots to process.`);

    for (const plot of plots) {
        const areaHa = plot.area_sotok / 100;
        const haStr = areaHa.toFixed(2).replace(/\.00$/, "");
        const haLabel = `(${haStr} гектар)`;

        // Basic pattern: "Участок [AREA] сот. [NEW_LABEL] [REST]"
        // We need to be careful not to double-add if it's already there
        if (plot.title.includes("гектар")) {
            console.log(`ℹ️ Plot ${plot.cadastral_number} already has hectare info, skipping or updating if needed.`);
            // If we want to be safe and update it anyway (e.g. if the number changed):
            // For now, let's just skip to be safe, unless it matches the exact old area.
        }

        // We want the format: Участок X сот. (Y гектар) [ (СХ) ] [ Поселок ]
        // Let's rebuild the title to be consistent.

        let areaSotokStr = plot.area_sotok.toFixed(2).replace(/\.00$/, "");
        let titleParts = [`Участок ${areaSotokStr} сот.`, haLabel];

        if (plot.title.includes("(СХ)")) {
            titleParts.push("(СХ)");
        }

        if (plot.location) {
            titleParts.push(plot.location);
        }

        const newTitle = titleParts.join(" ");

        if (newTitle !== plot.title) {
            console.log(`⚙️ Updating ${plot.cadastral_number}:`);
            console.log(`   Old: ${plot.title}`);
            console.log(`   New: ${newTitle}`);

            const { error: updateError } = await supabase
                .from('land_plots')
                .update({ title: newTitle })
                .eq('id', plot.id);

            if (updateError) {
                console.error(`   ❌ Error: ${updateError.message}`);
            } else {
                console.log(`   ✅ Success`);
            }
        }
    }

    console.log("🏁 Hectare titles update complete.");
}

updateHaTitles().catch(console.error);
