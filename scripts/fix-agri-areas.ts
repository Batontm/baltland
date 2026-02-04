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

async function fixAgriAreas() {
    const targetPlots = [
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

    console.log(`🛠 Starting correction of areas for ${targetPlots.length} agricultural plots...`);

    for (const cadastral of targetPlots) {
        // Fetch current area
        const { data: plot, error: fetchError } = await supabase
            .from('land_plots')
            .select('area_sotok')
            .eq('cadastral_number', cadastral)
            .single();

        if (fetchError || !plot) {
            console.error(`⚠️ Could not find or fetch plot ${cadastral}: ${fetchError?.message}`);
            continue;
        }

        // If area is large, divide by 100
        if (plot.area_sotok > 5000) { // Safety check: typical agri plots here are >5000 in the bugged state (since actually 50+)
            const newArea = plot.area_sotok / 100;
            const { error: updateError } = await supabase
                .from('land_plots')
                .update({ area_sotok: newArea })
                .eq('cadastral_number', cadastral);

            if (updateError) {
                console.error(`❌ Error updating ${cadastral}: ${updateError.message}`);
            } else {
                console.log(`✅ Fixed ${cadastral}: ${plot.area_sotok} -> ${newArea} sotok`);
            }
        } else {
            console.log(`ℹ️ Plot ${cadastral} area is already ${plot.area_sotok} (not inflated), skipping.`);
        }
    }

    console.log("🏁 Area correction complete.");
}

fixAgriAreas().catch(console.error);
