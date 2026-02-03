
// Helper to load env file
function loadEnv(filePath: string) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
}

// Load .env.local FIRST
loadEnv(path.join(process.cwd(), '.env.local'));
loadEnv(path.join(process.cwd(), '.env'));

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
});

const MAPPING = {
    '39:03:080808:542': '39:03:080808:562',
    '39:03:080808:541': '39:03:080808:569',
    '39:03:080808:540': '39:03:080808:570',
    '39:03:080808:539': '39:03:080808:571',
    '39:03:080808:551': '39:03:080808:572',
    '39:03:080808:552': '39:03:080808:573',
    '39:03:080808:553': '39:03:080808:574',
    '39:03:080808:554': '39:03:080808:575',
    '39:03:080808:555': '39:03:080808:576',
    '39:03:080808:556': '39:03:080808:563',
    '39:03:080808:557': '39:03:080808:564',
    '39:03:080808:558': '39:03:080808:568',
    '39:03:080808:559': '39:03:080808:565',
    '39:03:080808:560': '39:03:080808:566'
};

async function main() {
    console.log(`📡 Fixing Shosseynoe on ${SUPABASE_URL}...`);

    for (const [childCad, parentCad] of Object.entries(MAPPING)) {
        // 1. Get Parent ID
        const { data: parent } = await supabase
            .from('land_plots')
            .select('id, bundle_id, is_bundle_primary')
            .eq('cadastral_number', parentCad)
            .single();

        if (!parent) {
            console.error(`❌ Parent not found: ${parentCad}`);
            continue;
        }

        const bundleId = parent.id; // Primary plot's bundle_id usually points to itself or is the grouping ID. 
        // In this DB schema, often primary.bundle_id == primary.id. 
        // But let's check if it has a distinct bundle_id.
        // From previous output: 569 has bundle_id = f07d56ad... which matches its ID.
        // So we use parent.id.

        // 2. Get Child ID
        const { data: child } = await supabase
            .from('land_plots')
            .select('id, bundle_id')
            .eq('cadastral_number', childCad)
            .single();

        if (!child) {
            console.error(`❌ Child not found: ${childCad}`);
            continue;
        }

        // 3. Update Child
        if (child.bundle_id !== bundleId) {
            const { error } = await supabase
                .from('land_plots')
                .update({
                    bundle_id: bundleId,
                    is_bundle_primary: false
                })
                .eq('id', child.id);

            if (error) console.error(`Failed to link ${childCad}:`, error.message);
            else console.log(`✅ Linked ${childCad} -> ${parentCad}`);
        } else {
            console.log(`👌 Already linked ${childCad} -> ${parentCad}`);
        }
    }
}

main().catch(console.error);
