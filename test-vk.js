const fs = require('fs');

// Read .env manually
try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const envVars = envFile.split('\n').reduce((acc, line) => {
        const [key, val] = line.split('=');
        if (key && val) acc[key.trim()] = val.trim();
        return acc;
    }, {});
    process.env = { ...process.env, ...envVars };
} catch (e) {
    console.log("No .env file found");
}

async function testVkUpload() {
    const VK_API_BASE = "https://api.vk.com/method";
    const accessToken = process.env.VK_ACCESS_TOKEN;

    if (!accessToken) {
        console.error("No VK_ACCESS_TOKEN");
        return;
    }

    console.log("Token:", accessToken.substring(0, 10) + "...");

    async function vkRequest(method, params) {
        const url = new URL(`${VK_API_BASE}/${method}`);
        url.searchParams.set("access_token", accessToken);
        url.searchParams.set("v", "5.131");

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, String(value));
        }

        console.log(`Requesting ${method}...`);
        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.error) {
            console.error("API Error:", data.error);
            throw new Error(`VK API Error ${data.error.error_code}: ${data.error.error_msg}`);
        }
        return data.response;
    }

    try {
        console.log("Checking if this is a group token...");
        try {
            const groups = await vkRequest("groups.getById", {});
            console.log("Group Info:", JSON.stringify(groups, null, 2));
        } catch (e) {
            console.log("Not a group or error checking group:", e.message);
        }

        console.log("1. Getting upload server (no group_id)...");
        const uploadServer = await vkRequest("photos.getWallUploadServer", {});
        console.log("Success! Server:", uploadServer.upload_url);
    } catch (e) {
        console.error("Failed:", e.message);
    }
}

testVkUpload();
