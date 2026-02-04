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

async function fixMidRangeAreas() {
    console.log("🛠 Starting mid-range area correction (100-2500 range)...");

    // 1. Fetch plots that are likely sqm instead of sotok
    // Criteria: area_sotok between 100 and 2500, price/area < 10000 (meaning < 1M per corrected hectare)
    // or land_status = "ИЖС" and area >= 100
    const { data: plots, error } = await supabase
        .from("land_plots")
        .select("id, cadastral_number, area_sotok, title, price, land_status, location")
        .gte("area_sotok", 100)
        .lt("area_sotok", 2500);

    if (error) {
        console.error("❌ Error fetching plots:", error.message);
        return;
    }

    console.log(`🔍 Analying ${plots.length} plots in 100-2500 range...`);

    let updatedCount = 0;

    for (const plot of plots) {
        const pps = plot.price / plot.area_sotok;
        let shouldFix = false;

        // Rule 1: ИЖС plots are almost never > 100 sotok. If they are, it is likely sqm.
        if (plot.land_status === "ИЖС" && plot.area_sotok >= 100) {
            shouldFix = true;
        }
        // Rule 2: Exceptionally low price per sotka for residential areas
        else if (pps < 5000 && !plot.title.includes("(СХ)")) {
            shouldFix = true;
        }
        // Rule 3: Specific cadastral groups known to have this issue (e.g. 39:03:060008)
        else if (plot.cadastral_number.startsWith("39:03:060008")) {
            shouldFix = true;
        }

        if (shouldFix) {
            const oldArea = plot.area_sotok;
            const newArea = oldArea / 100;

            // Generate new title - we need to remove the "(X гектар)" if it was added incorrectly
            // and update the area string
            let newTitle = plot.title;

            // Remove incorrect hectare label if present (e.g. "(6 гектар)")
            newTitle = newTitle.replace(/\(\d+(\.\d+)? гектар\)/g, "").trim();

            // Replace old area number in title
            // Title usually starts with "Участок XXX сот."
            const oldAreaStr = oldArea.toFixed(2).replace(/\.00$/, "");
            const newAreaStr = newArea.toFixed(2).replace(/\.00$/, "");

            if (newTitle.includes(`${oldAreaStr} сот.`)) {
                newTitle = newTitle.replace(`${oldAreaStr} сот.`, `${newAreaStr} сот.`);
            } else if (newTitle.includes(` ${oldAreaStr} `)) {
                newTitle = newTitle.replace(` ${oldAreaStr} `, ` ${newAreaStr} `);
            }

            console.log(`⚙️ Updating ${plot.cadastral_number}: ${oldArea} -> ${newArea}`);
            console.log(`   Old: ${plot.title}`);
            console.log(`   New: ${newTitle}`);

            const { error: updateError } = await supabase
                .from("land_plots")
                .update({
                    area_sotok: newArea,
                    title: newTitle
                })
                .eq("id", plot.id);

            if (updateError) {
                console.error(`❌ Failed to update ${plot.cadastral_number}:`, updateError.message);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\n🏁 Mid-range correction complete. Updated ${updatedCount} plots.`);
    console.log("💡 Note: You might need to re-run update-ha-titles.ts to add hectare labels to any remaining REAL large plots.");
}

fixMidRangeAreas().catch(console.error);
