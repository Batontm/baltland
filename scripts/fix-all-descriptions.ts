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

async function fixAllDescriptions() {
    console.log("🛠 Starting global description area correction...");

    const { data: plots, error } = await supabase
        .from("land_plots")
        .select("id, cadastral_number, area_sotok, description")
        .not("description", "is", null);

    if (error) {
        console.error("❌ Error fetching plots:", error.message);
        return;
    }

    console.log(`🔍 Analyzing ${plots.length} descriptions...`);

    let updatedCount = 0;

    for (const plot of plots) {
        if (!plot.description) continue;

        // Pattern to find "Участок XXX сот."
        // We look for cases where XXX is area_sotok * 100
        const pattern = /Участок (\d+(\.\d+)?) сот/g;
        let hasChanges = false;

        const newDescription = plot.description.replace(pattern, (match, p1) => {
            const descArea = parseFloat(p1);
            if (descArea !== plot.area_sotok && descArea === plot.area_sotok * 100) {
                hasChanges = true;
                const correctArea = plot.area_sotok.toLocaleString("ru-RU", { maximumFractionDigits: 2 }).replace(",", ".");
                console.log(`⚙️ Fixing ${plot.cadastral_number}: ${descArea} -> ${correctArea}`);
                return `Участок ${correctArea} сот`;
            }
            return match;
        });

        if (hasChanges) {
            const { error: updateError } = await supabase
                .from("land_plots")
                .update({ description: newDescription })
                .eq("id", plot.id);

            if (updateError) {
                console.error(`❌ Failed to update ${plot.cadastral_number}:`, updateError.message);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`\n🏁 Global correction complete. Updated ${updatedCount} descriptions.`);
}

fixAllDescriptions().catch(console.error);
