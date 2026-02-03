
// Helper to load env file
function loadEnv(filePath: string) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
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

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load keys from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
});

async function findPlotByCadastral(cadastral: string) {
    const { data, error } = await supabase
        .from('land_plots')
        .select('id, cadastral_number, bundle_id, is_bundle_primary, title')
        .eq('cadastral_number', cadastral)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        // console.error(`Error finding plot ${cadastral}:`, error.message);
    }
    return data;
}

async function updatePlot(id: string, updates: any) {
    const { error } = await supabase
        .from('land_plots')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error(`Error updating plot ${id}:`, error.message);
        return false;
    }
    return true;
}

async function main() {
    const dataPath = path.join(process.cwd(), 'bundled_plots_data.jsonl');

    if (!fs.existsSync(dataPath)) {
        console.error(`❌ Error: File not found at ${dataPath}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    console.log(`🚀 Starting bundle restoration for ${lines.length} groups...`);
    console.log(`📡 URL: ${SUPABASE_URL}`);

    let fixedCount = 0;
    let missingCount = 0;
    let errorCount = 0;

    for (const line of lines) {
        try {
            const bundle = JSON.parse(line);
            const mainCadastral = bundle.main;

            // 1. Handle Primary Plot
            const primaryPlot = await findPlotByCadastral(mainCadastral);

            if (!primaryPlot) {
                // console.warn(`⚠️  Primary plot not found: ${mainCadastral}`);
                missingCount++;
                continue;
            }

            const bundleId = primaryPlot.id;

            // Validate/Update Primary
            if (!primaryPlot.is_bundle_primary || primaryPlot.bundle_id !== bundleId) {
                const ok = await updatePlot(primaryPlot.id, {
                    bundle_id: bundleId,
                    is_bundle_primary: true
                });
                if (!ok) errorCount++;
            }

            // 2. Handle Secondary Plots
            for (const plotData of bundle.plots) {
                if (plotData.is_primary) continue; // Skip primary here

                const secCadastral = plotData.cadastral;
                const secPlot = await findPlotByCadastral(secCadastral);

                if (!secPlot) {
                    // console.warn(`    ⚠️  Secondary plot not found: ${secCadastral}`);
                    missingCount++;
                    continue;
                }

                if (secPlot.bundle_id !== bundleId) {
                    console.log(`    🔗 Linking ${secCadastral} -> ${mainCadastral}`);
                    const ok = await updatePlot(secPlot.id, {
                        bundle_id: bundleId,
                        is_bundle_primary: false
                    });
                    if (ok) fixedCount++;
                    else errorCount++;
                } else {
                    // console.log(`    ✅ Already linked: ${secCadastral}`);
                }
            }

        } catch (e) {
            console.error('Error processing line:', e);
            errorCount++;
        }
    }

    console.log('\n==========================================');
    console.log('🏁 Finished.');
    console.log(`✅ Connections restored: ${fixedCount}`);
    console.log(`⚠️  Plots not found: ${missingCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('==========================================');
}

main().catch(console.error);
