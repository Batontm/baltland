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

async function bulkFixAreas() {
    console.log("🔍 Fetching plots with area > 2500...");

    // We fetch everything > 2500. This includes those that were already fixed if they are still over 2500,
    // so we need a way to avoid double-dividing. 
    // Actually, in the previous run most became < 2500 (e.g. 62700 -> 627).
    // Some however were very large (237500 -> 2375) - these might still be > 2500.

    const { data: plots, error } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, area_sotok, title, description')
        .gt('area_sotok', 2500);

    if (error) {
        console.error("Error fetching plots:", error.message);
        return;
    }

    if (!plots || plots.length === 0) {
        console.log("No plots found with area > 2500.");
        return;
    }

    console.log(`📊 Found ${plots.length} plots to process.`);

    for (const plot of plots) {
        const oldArea = plot.area_sotok;
        const newArea = oldArea / 100;

        // Prepare new title
        // Replace the old area number in the title.
        // Title format is usually "Участок [AREA] сот. [LOCATION]"
        const oldAreaStr = oldArea.toString();
        const newAreaStr = newArea.toFixed(2).replace(/\.00$/, "");

        let newTitle = plot.title;
        if (newTitle.includes(oldAreaStr)) {
            newTitle = newTitle.replace(oldAreaStr, newAreaStr);
        }

        console.log(`⚙️ Processing ${plot.cadastral_number}: ${oldArea} -> ${newArea}`);
        console.log(`   Old Title: ${plot.title}`);
        console.log(`   New Title: ${newTitle}`);

        const { error: updateError } = await supabase
            .from('land_plots')
            .update({
                area_sotok: newArea,
                title: newTitle
            })
            .eq('id', plot.id);

        if (updateError) {
            console.error(`❌ Error updating plot ${plot.id}: ${updateError.message}`);
        } else {
            console.log(`✅ Fixed plot ${plot.cadastral_number}`);
        }
    }

    console.log("🏁 Bulk correction complete.");
}

bulkFixAreas().catch(console.error);
