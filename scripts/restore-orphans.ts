
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

async function updateBundle(plotId: string, bundleId: string) {
    const { error } = await supabase
        .from('land_plots')
        .update({ bundle_id: bundleId, is_bundle_primary: false })
        .eq('id', plotId);
    return !error;
}

async function main() {
    console.log(`📡 restoring orphans on ${SUPABASE_URL}...`);

    // Fetch Orphans
    const { data: orphans } = await supabase
        .from('land_plots')
        .select('id, title, cadastral_number, location')
        .ilike('title', '%Лот: % участка (дополнительный)%')
        .is('bundle_id', null);

    // Fetch Primaries
    const { data: primaries } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, location, bundle_id')
        .eq('is_bundle_primary', true);

    if (!orphans || !primaries) {
        console.error('Failed to fetch data');
        return;
    }

    const parseCad = (c: string) => {
        const parts = c.split(':');
        const num = parseInt(parts[parts.length - 1], 10);
        const prefix = parts.slice(0, parts.length - 1).join(':');
        return { prefix, num };
    };

    let restored = 0;

    for (const orphan of orphans) {
        if (!orphan.cadastral_number) continue;
        const orphanCad = parseCad(orphan.cadastral_number);

        // Find matches
        const candidates = primaries.filter(p => {
            if (!p.cadastral_number) return false;
            if (p.location !== orphan.location) return false;
            const pCad = parseCad(p.cadastral_number);
            if (pCad.prefix !== orphanCad.prefix) return false;
            if (Math.abs(pCad.num - orphanCad.num) > 20) return false;
            return true;
        });

        // Best match
        candidates.sort((a, b) => {
            const da = Math.abs(parseCad(a.cadastral_number!).num - orphanCad.num);
            const db = Math.abs(parseCad(b.cadastral_number!).num - orphanCad.num);
            return da - db;
        });

        if (candidates.length > 0) {
            const best = candidates[0];
            const bundleId = best.bundle_id || best.id; // Use bundle_id if set, else its own ID

            // NOTE: Primary plots should have their OWN ID as bundle_id if they are roots. 
            // If bundle_id is null on primary, we must fix primary first? 
            // Step 192 showed primaries HAVE bundle_id set to their own ID.

            if (bundleId) {
                console.log(`🔗 Restoring: ${orphan.cadastral_number} -> ${best.cadastral_number} (${bundleId})`);
                await updateBundle(orphan.id, bundleId);
                restored++;
            } else {
                console.log(`⚠️  Parent ${best.cadastral_number} has no bundle_id! Skipping.`);
            }
        }
    }

    console.log(`\n✅ Restored ${restored} connections.`);
}

main().catch(console.error);
