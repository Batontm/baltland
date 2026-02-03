
import { KALININGRAD_SETTLEMENTS } from "@/lib/kaliningrad-settlements";

// Copying the logic from actions.ts matching block to verify it standalone
function testMatchingLogic(nspdAddress: string) {
    console.log("Testing address:", nspdAddress);

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
    }

    console.log("Detected District:", detectedDistrictName);
    console.log("Detected Settlement:", detectedSettlementName);

    // 3. Match Logic
    let finalDistrictName = "";
    let finalSettlementName = "";

    const candidates = KALININGRAD_SETTLEMENTS.filter(s => {
        const settlementMatches = detectedSettlementName && s.name.toLowerCase().includes(detectedSettlementName.toLowerCase());
        const districtMatches = detectedDistrictName
            ? s.district.toLowerCase().replace(" район", "").includes(detectedDistrictName.toLowerCase())
            : true;
        return settlementMatches && districtMatches;
    });

    if (candidates.length > 0) {
        const exactMatch = candidates.find(c =>
            c.name.toLowerCase() === (detectedSettlementName.toLowerCase().startsWith("п") ? detectedSettlementName.toLowerCase() : `п. ${detectedSettlementName.toLowerCase()}`) ||
            c.name.toLowerCase() === detectedSettlementName.toLowerCase()
        );
        const bestMatch = exactMatch || candidates[0];
        finalSettlementName = bestMatch.name;
        finalDistrictName = bestMatch.district;
    }

    console.log("Final District:", finalDistrictName);
    console.log("Final Settlement:", finalSettlementName);
    console.log("---");
}

async function run() {
    // Test case for the user's plot 39:03:090913:640
    // Based on typical NSPD format for that area (Kumachevo, Gurievsky)
    const testAddress1 = "Калининградская обл, р-н Гурьевский, п Кумачево, ул Центральная";

    testMatchingLogic(testAddress1);
}

run();
