
"use server"

import { createAdminClient } from "@/lib/supabase/admin";

export async function testMatchingLogic() {
    const supabase = createAdminClient();
    const testAddresses = [
        "Калининградская обл, Гурьевский р-н, п Поддубное",
        "Калининградская область, р-н Зеленоградский, п Коврово",
        "Калининградская обл, г Калининград, ул Центральная"
    ];

    console.log("--- TESTING DB MATCHING LOGIC ---");

    for (const nspdAddress of testAddresses) {
        console.log(`\nAnalyzing: "${nspdAddress}"`);
        const parts = nspdAddress.split(',').map(p => p.trim());

        let detectedDistrictName = "";
        let detectedSettlementName = "";

        // 1. Detect District
        const districtPart = parts.find(p =>
            p.includes("р-н") || p.includes("г.о.") || p.includes("городской округ") || p.includes("район")
        );

        if (districtPart) {
            detectedDistrictName = districtPart
                .replace(/р-н|г\.о\.|городской округ|район/g, "")
                .trim();
        }

        // 2. Detect Settlement
        const settlementMarkers = ["г ", "п ", "пос ", "с ", "д ", "ст-ца ", "х "];
        const settlementPart = parts.find(p =>
            settlementMarkers.some(marker => p.startsWith(marker)) ||
            p.includes(" г") || p.includes(" п ") || p.includes(" пос")
        );

        if (settlementPart) {
            detectedSettlementName = settlementPart
                .replace(/г\.|п\.|пос\.|с\.|д\.|ст-ца|х\.|г |п |пос |с |д /g, "")
                .trim();
        } else if (!districtPart && parts.length > 2) {
            const potentialCity = parts[1];
            if (potentialCity.includes("г ") || potentialCity.includes("г.")) {
                detectedSettlementName = potentialCity.replace(/г\.|г /g, "").trim();
            }
        }

        console.log(`Detected Hints -> District: "${detectedDistrictName}", Settlement: "${detectedSettlementName}"`);

        // 3. DB Search
        let dbDistrictId: string | null = null;
        let finalDistrictName = "";
        let finalSettlementName = "";

        // 3a. Find District
        if (detectedDistrictName) {
            const { data: districts } = await supabase
                .from("districts")
                .select("id, name")
                .ilike("name", `%${detectedDistrictName}%`)
                .limit(1);

            if (districts && districts.length > 0) {
                dbDistrictId = districts[0].id;
                finalDistrictName = districts[0].name;
                console.log(`DB District Match: ${finalDistrictName} (${dbDistrictId})`);
            } else {
                console.log("DB District Match: FAILED");
            }
        }

        // 3b. Find Settlement
        if (detectedSettlementName && dbDistrictId) {
            const { data: mills } = await supabase
                .from("settlements")
                .select("name")
                .eq("district_id", dbDistrictId)
                .ilike("name", `%${detectedSettlementName}%`)
                .limit(1);

            if (mills && mills.length > 0) {
                finalSettlementName = mills[0].name;
                console.log(`DB Settlement Match: ${finalSettlementName}`);
            } else {
                console.log("DB Settlement Match: FAILED (in district)");
            }
        } else if (detectedSettlementName && !dbDistrictId) {
            const { data: mills } = await supabase
                .from("settlements")
                .select("name, districts(name)")
                .ilike("name", `%${detectedSettlementName}%`)
                .limit(1);

            if (mills && mills.length > 0) {
                finalSettlementName = mills[0].name;
                // @ts-ignore
                if (mills[0].districts) finalDistrictName = mills[0].districts.name;
                console.log(`DB Settlement Match (Global): ${finalSettlementName}, District: ${finalDistrictName}`);
            } else {
                console.log("DB Settlement Match (Global): FAILED");
            }
        }
    }
}
