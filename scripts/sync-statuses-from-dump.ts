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

async function syncStatusesFromDump() {
    console.log("🔄 Starting bulk status sync from dump data...");

    const dataFile = path.resolve(process.cwd(), "extracted_statuses.txt");
    if (!fs.existsSync(dataFile)) {
        console.error("❌ Data file extracted_statuses.txt not found!");
        return;
    }

    const lines = fs.readFileSync(dataFile, "utf8").split("\n").filter(l => l.trim());

    const agriPlots: string[] = [];
    const industrialPlots: string[] = [];

    for (const line of lines) {
        const [status, cadastral] = line.split(":");
        if (status === "СХ") agriPlots.push(cadastral);
        else if (status === "Промка") industrialPlots.push(cadastral);
    }

    console.log(`📊 Found ${agriPlots.length} agri plots and ${industrialPlots.length} industrial plots.`);

    // Update Agri
    if (agriPlots.length > 0) {
        const { error: errorAgri } = await supabase
            .from("land_plots")
            .update({ land_status: "СХ" })
            .in("cadastral_number", agriPlots);

        if (errorAgri) console.error("❌ Error updating agri plots:", errorAgri.message);
        else console.log(`✅ Updated ${agriPlots.length} plots to 'СХ'`);
    }

    // Update Industrial
    if (industrialPlots.length > 0) {
        const { error: errorInd } = await supabase
            .from("land_plots")
            .update({ land_status: "Промка" })
            .in("cadastral_number", industrialPlots);

        if (errorInd) console.error("❌ Error updating industrial plots:", errorInd.message);
        else console.log(`✅ Updated ${industrialPlots.length} plots to 'Промка'`);
    }

    console.log("🏁 Bulk sync complete.");
}

syncStatusesFromDump().catch(console.error);
