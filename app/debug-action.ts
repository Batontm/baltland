
"use server"

import { resolveLocationByCadastral } from "@/app/actions";

export async function testResolution() {
    const kn = "39:03:090913:640";
    console.log(`--- TESTING RESOLUTION FOR ${kn} ---`);
    const result = await resolveLocationByCadastral(kn);
    console.log("RESULT:", JSON.stringify(result, null, 2));
    return result;
}
