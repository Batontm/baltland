import { createClient } from "@supabase/supabase-js"
import * as path from "path"
import * as fs from "fs"

// Manual env loading
const envPath = path.resolve(process.cwd(), ".env.local")
const envContent = fs.readFileSync(envPath, "utf8")
const env = Object.fromEntries(
    envContent
        .split("\n")
        .filter(l => l && !l.startsWith("#"))
        .map(l => {
            const parts = l.split("=")
            const key = parts[0].trim()
            const value = parts.slice(1).join("=").trim().replace(/^"(.*)"$/, "$1")
            return [key, value]
        })
)

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateAgriStatus() {
    console.log("🚜 Starting update of land_status to 'СХ' for agricultural plots...");

    // 1. Update the known 13 plots
    const targetPlots = [
        "39:08:380003:1", "39:05:061002:57", "39:03:040005:103",
        "39:03:040005:105", "39:03:040005:84", "39:05:030620:14",
        "39:11:080906:219", "39:11:080901:366", "39:10:540003:182",
        "39:05:051109:24", "39:03:090805:373", "39:03:090805:372"
    ];

    const { error: updateError1 } = await supabase
        .from("land_plots")
        .update({ land_status: "СХ" })
        .in("cadastral_number", targetPlots);

    if (updateError1) {
        console.error("❌ Error updating target plots:", updateError1.message);
    } else {
        console.log(`✅ Successfully updated ${targetPlots.length} target plots to 'СХ' status.`);
    }

    // 2. Update any other plots that have (СХ) in their title but might have missed the target list
    const { data: agriTitles, error: fetchError } = await supabase
        .from("land_plots")
        .select("id, cadastral_number, title")
        .ilike("title", "%(СХ)%")
        .neq("land_status", "СХ");

    if (fetchError) {
        console.error("❌ Error fetching plots by title:", fetchError.message);
    } else if (agriTitles && agriTitles.length > 0) {
        console.log(`🔍 Found ${agriTitles.length} additional plots with '(СХ)' in title but wrong status.`);

        let updatedCount = 0;
        for (const plot of agriTitles) {
            const { error: updateError } = await supabase
                .from("land_plots")
                .update({ land_status: "СХ" })
                .eq("id", plot.id);

            if (!updateError) {
                updatedCount++;
                console.log(`✅ Updated plot ${plot.cadastral_number} to 'СХ'`);
            } else {
                console.error(`❌ Failed to update plot ${plot.cadastral_number}:`, updateError.message);
            }
        }
        console.log(`🏁 Finished updating ${updatedCount} additional agricultural plots.`);
    } else {
        console.log("ℹ️ No additional plots with '(СХ)' in title found.");
    }

    console.log("🏁 Status update complete.");
}

updateAgriStatus().catch(console.error);
