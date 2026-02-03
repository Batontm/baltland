
"use server"

import { createAdminClient } from "@/lib/supabase/admin";

export async function inspectDbData() {
    const supabase = createAdminClient();

    console.log("--- INSPECTING DB DATA ---");

    const { data: districts, error: dErr } = await supabase.from("districts").select("id, name").limit(10);
    if (dErr) console.error("District Error:", JSON.stringify(dErr, null, 2));
    console.log("Districts:", JSON.stringify(districts, null, 2));

    const { data: settlements, error: sErr } = await supabase.from("settlements").select("id, name, district_id").limit(10);
    if (sErr) console.error("Settlement Error:", JSON.stringify(sErr, null, 2));
    console.log("Settlements:", JSON.stringify(settlements, null, 2));
}
