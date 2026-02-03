import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

// Load .env.local FIRST (to override .env)
loadEnv(path.join(process.cwd(), '.env.local'));
loadEnv(path.join(process.cwd(), '.env'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
});

async function main() {
    console.log(`📡 Fetching orphaned plots from ${SUPABASE_URL}...`);

    // 1. Fetch Primary Orphans
    const { data: primaries, error: err1 } = await supabase
        .from('land_plots')
        .select('id, title, cadastral_number, location, district, bundle_id, is_bundle_primary, area_sotok')
        .ilike('title', '%Лот: % участка (главный)%')
        .is('bundle_id', null);

    if (err1) { console.error('Error fetching primaries:', err1); return; }

    // 2. Fetch Additional Orphans
    const { data: additionals, error: err2 } = await supabase
        .from('land_plots')
        .select('id, title, cadastral_number, location, district, bundle_id, is_bundle_primary, area_sotok')
        .ilike('title', '%Лот: % участка (дополнительный)%')
        .is('bundle_id', null);

    if (err2) { console.error('Error fetching additionals:', err2); return; }

    console.log(`Found ${primaries?.length} orphaned PRIMARY plots.`);
    console.log(`Found ${additionals?.length} orphaned ADDITIONAL plots.`);

    // 3. Match by Location + Cadastral Proximity
    const orphans = additionals || [];
    const candidates = primaries || []; // Actually we need ALL primaries, not just orphaned ones.

    // We need to fetch ALL primaries now, because the parents might NOT be orphaned (they might be valid bundles missing a child)
    const { data: allPrimaries, error: err3 } = await supabase
        .from('land_plots')
        .select('id, title, cadastral_number, location, district, bundle_id')
        .eq('is_bundle_primary', true);

    if (err3) { console.error('Error fetching all primaries:', err3); return; }

    console.log(`Checking against ${allPrimaries?.length} active primary bundles.`);

    // Helper to parse cadastral
    const parseCad = (c: string) => {
        const parts = c.split(':');
        const num = parseInt(parts[parts.length - 1], 10);
        const prefix = parts.slice(0, parts.length - 1).join(':');
        return { prefix, num };
    };

    let matchCount = 0;

    for (const orphan of orphans) {
        if (!orphan.cadastral_number) continue;
        const orphanCad = parseCad(orphan.cadastral_number);

        // Filter candidates by location/district/cadastral prefix
        const potentialParents = (allPrimaries || []).filter(p => {
            if (!p.cadastral_number) return false;
            // Must match location
            if (p.location !== orphan.location) return false;
            // Must match cadastral prefix
            const pCad = parseCad(p.cadastral_number);
            if (pCad.prefix !== orphanCad.prefix) return false;
            // Distance check (e.g. within 20)
            if (Math.abs(pCad.num - orphanCad.num) > 20) return false;
            return true;
        });

        // Sort by distance
        potentialParents.sort((a, b) => {
            const da = Math.abs(parseCad(a.cadastral_number!).num - orphanCad.num);
            const db = Math.abs(parseCad(b.cadastral_number!).num - orphanCad.num);
            return da - db;
        });

        if (potentialParents.length > 0) {
            const best = potentialParents[0];
            const dist = Math.abs(parseCad(best.cadastral_number!).num - orphanCad.num);
            console.log(`✅ MATCH: ${orphan.cadastral_number} -> ${best.cadastral_number} (Dist: ${dist}, Bundle: ${best.bundle_id}) [${orphan.location}]`);
            matchCount++;
        } else {
            console.log(`❌ NO PARENT: ${orphan.cadastral_number} [${orphan.location}]`);
        }
    }

    console.log(`\nMatched: ${matchCount}/${orphans.length}`);
}

main().catch(console.error);
