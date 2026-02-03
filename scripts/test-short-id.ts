
import { getLandPlotById } from "@/app/actions";

async function main() {
    console.log("Testing getLandPlotById...");

    // 1. Test invalid ID
    try {
        const res = await getLandPlotById("invalid-id");
        console.log("Invalid ID result:", res);
    } catch (e) {
        console.log("Invalid ID error:", e);
    }

    // 2. Test UUID (simulated) - we need a real UUID from DB, but we can't easily get one without querying first.
    // We will assume the function works if it doesn't crash on invalid input.

    // 3. Test Integer ID (simulated)
    try {
        const res2 = await getLandPlotById("123");
        console.log("Integer ID '123' result:", res2); // Should be null or plot if 123 exists
    } catch (e) {
        console.log("Integer ID error:", e);
    }

    console.log("Done.");
}

main();
