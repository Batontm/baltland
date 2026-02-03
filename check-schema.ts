import { createAdminClient } from "./lib/supabase/admin"

async function checkSchema() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from("land_plots")
        .select("coordinates_json, has_coordinates, center_lat, center_lon")
        .limit(1)

    if (error) {
        console.error("❌ Error fetching columns:", error.message)
        if (error.message.includes("column") || error.message.includes("does not exist")) {
            console.log("👉 Suggestion: Run migrations/add_plot_coordinates.sql in Supabase SQL Editor.")
        }
    } else {
        console.log("✅ Columns exist in land_plots table.")
    }

    const { error: settingsError } = await supabase.from("organization_settings").select("*").limit(1)
    if (settingsError) {
        console.error("❌ Error fetching organization_settings:", settingsError.message)
    } else {
        console.log("✅ organization_settings table exists.")
    }
}

checkSchema()
