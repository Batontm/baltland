import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load keys from environment
// Manual .env loading if needed
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const envPath = path.join(process.cwd(), '.env');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    [envPath, envLocalPath].forEach(p => {
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf-8');
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) process.env[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
            });
        }
    });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
});

interface ParsedPlot {
    cadastral: string;
    area: number | null;
    price: number | null;
    ownership: 'ownership' | 'lease' | null;
    priceIsForBundle?: boolean;
}

interface BundleGroup {
    location?: string;
    plots: ParsedPlot[];
    explicitBundlePrice?: number;
    explicitBundlePlotCads?: string[];
}

function parsePrice(raw: string): number | null {
    if (!raw || raw.includes('ниже') || raw.includes('-')) return null;
    const clean = raw.replace(/[^\d]/g, '');
    return clean ? parseInt(clean) : null;
}

function parseArea(raw: string): number | null {
    if (!raw) return null;
    const clean = raw.replace(/[^\d]/g, '');
    return clean ? parseInt(clean) : null;
}

function parseOwnership(raw: string): 'ownership' | 'lease' {
    if (raw.includes('аренда')) return 'lease';
    return 'ownership';
}

async function main() {
    const rawData = fs.readFileSync(path.join(process.cwd(), 'manual_bundles_input.txt'), 'utf-8');
    const lines = rawData.split('\n').map(l => l.trim()).filter(l => l);

    const groups: BundleGroup[] = [];
    let currentGroup: BundleGroup = { plots: [] };
    let currentLocation = '';

    for (const line of lines) {
        if (line.startsWith('Пос.')) {
            // New location section
            if (currentGroup.plots.length > 0) {
                currentGroup.location = currentLocation;
                groups.push(currentGroup);
            }
            currentLocation = line; // "Пос. Вишневка..."
            currentGroup = { plots: [] };
            continue;
        }

        if (line.startsWith('---')) {
            // Separator - finalize current group
            if (currentGroup.plots.length > 0) {
                currentGroup.location = currentLocation;
                groups.push(currentGroup);
                currentGroup = { plots: [] };
            }
            continue;
        }

        // Check for "Продаются вместе" / "Стоимость за" line -> This Terminating the current group
        if (line.toLowerCase().includes('продаются вместе') || line.toLowerCase().includes('стоимость за') || line.toLowerCase().includes('продаются только вместе')) {
            // Parse explicit price if available
            const priceMatch = line.match(/(\d[\d\.]+) р/);
            if (priceMatch) {
                const p = parsePrice(priceMatch[1]);
                if (p !== null) currentGroup.explicitBundlePrice = p;
            }

            // Finalize group immediately
            if (currentGroup.plots.length > 0) {
                currentGroup.location = currentLocation;
                groups.push(currentGroup);
                currentGroup = { plots: [] };
            }
            continue;
        }

        // Parse Plot Line: 39:03:040028:366, площадь 1000 кв м, цена 600.000 р – собственность
        const cadMatch = line.match(/^(\d{2}:\d{2}:\d{6,}:\d+)/);
        if (cadMatch) {
            const cadastral = cadMatch[1];

            // Extract area
            const areaMatch = line.match(/площадь\s+(\d+)\s+кв\s+м/);
            const area = areaMatch ? parseInt(areaMatch[1]) : null;

            // Extract price
            // "цена 600.000 р" or "цена - р" or "цена за все ниже р"
            let price = null;
            let priceIsForBundle = false;

            if (line.includes('цена за все')) {
                priceIsForBundle = true;
            } else {
                const pricePart = line.match(/цена\s+([\d\.]+)\s+р/);
                if (pricePart) {
                    price = parsePrice(pricePart[1]);
                }
            }

            const ownership = parseOwnership(line);

            currentGroup.plots.push({
                cadastral,
                area,
                price,
                ownership,
                priceIsForBundle
            });
        }
    }
    // Push last group
    if (currentGroup.plots.length > 0) {
        currentGroup.location = currentLocation;
        groups.push(currentGroup);
    }


    console.log(`Found ${groups.length} plot groups to process.`);

    for (const group of groups) {
        if (group.plots.length < 2) {
            // Only 1 plot in group? If it has a price, maybe just update it.
            // But the user request implies bundles.
            // Let's skip single plots for now or handle them as "update only".
            console.log(`Skipping group with ${group.plots.length} plots (single plot update?): ${group.plots[0].cadastral}`);
            // Actually, some single lines might simply be price updates.
            // But the user context is "analyze base for unlinked lots".
            // Let's focus on bundling first.
            continue;
        }

        // Deduplicate plots in the group based on cadastral number
        const uniquePlots = new Map<string, ParsedPlot>();
        group.plots.forEach(p => uniquePlots.set(p.cadastral, p));
        group.plots = Array.from(uniquePlots.values());

        console.log(`Processing group for ${group.location || 'Unknown'}: ${group.plots.map(p => p.cadastral).join(', ')}`);

        // 1. Verify all plots exist
        const cadastrals = group.plots.map(p => p.cadastral);
        const { data: dbPlots, error } = await supabase
            .from('land_plots')
            .select('id, cadastral_number, bundle_id, is_bundle_primary, price')
            .in('cadastral_number', cadastrals);

        if (error || !dbPlots || dbPlots.length !== cadastrals.length) {
            console.warn(`⚠️ Warning: Found only ${dbPlots?.length} of ${cadastrals.length} plots in DB. Skipping group.`);
            const missing = cadastrals.filter(c => !dbPlots?.some(dp => dp.cadastral_number === c));
            console.warn(`   Missing: ${missing.join(', ')}`);
            continue;
        }

        // 2. Identify Target Bundle ID
        // 3. Determine Primary Plot
        // If one is already primary, keep it. If not, pick the first one in the list.
        let primaryPlot = dbPlots.find(p => p.is_bundle_primary);

        if (!primaryPlot) {
            // Find the plot corresponding to the first one in the user list
            const firstInList = group.plots[0];
            primaryPlot = dbPlots.find(p => p.cadastral_number === firstInList.cadastral)!;
            console.log(`   Electing NEW primary: ${primaryPlot.cadastral_number}`);
        }

        // Use Primary Plot ID as Bundle ID (Project Convention)
        const bundleId = primaryPlot.id;
        console.log(`   Using Primary ID as Bundle ID: ${bundleId}`);

        // 4. Calculate Bundle Price
        // If explicit bundle price is given, use it.
        // Else sum individual prices? Or use the price from the primary?
        // In the user data: "Продаются вместе цена за все... 2.700.00 р"
        let finalPrice = group.explicitBundlePrice || 0;

        if (!finalPrice) {
            // If individual prices are listed, sum them? 
            // Often logic: individual prices = sum. But sometimes discounted.
            // If explicit price is missing, check if individual plots have prices.
            // "39:03:040028:366, ... цена 600.000 р"
            // "39:03:040028:367, ... цена 700.000 р"
            // If no explicit "total", we should probably sum them or set them individually?
            // Actually, for a bundle, the PRIMARY plot holds the price in our schema.
            // Secondary plots usually have price=0 or null.
            const sumIndividual = group.plots.reduce((acc, p) => acc + (p.price || 0), 0);
            if (sumIndividual > 0) finalPrice = sumIndividual;
        }

        // 5. Apply Updates

        // Update Primary
        const { error: updatePrimError } = await supabase
            .from('land_plots')
            .update({
                bundle_id: bundleId,
                is_bundle_primary: true,
                price: finalPrice, // Set the full bundle price on primary
                ownership_type: group.plots.find(p => p.cadastral === primaryPlot!.cadastral_number)?.ownership || 'ownership',
                // Title? Maybe update title to "Лот..." if it's currently generic? Leaving title alone for now to avoid overwriting good names.
            })
            .eq('id', primaryPlot.id);

        if (updatePrimError) console.error(`   ❌ Error updating primary ${primaryPlot.cadastral_number}:`, updatePrimError);
        else console.log(`   ✅ Updated Primary: ${primaryPlot.cadastral_number} | Price: ${finalPrice}`);

        // Update Secondaries
        for (const plot of dbPlots) {
            if (plot.id === primaryPlot.id) continue;

            const plotData = group.plots.find(p => p.cadastral === plot.cadastral_number);
            const ownership = plotData?.ownership || 'ownership';

            const { error: updateSecError } = await supabase
                .from('land_plots')
                .update({
                    bundle_id: bundleId,
                    is_bundle_primary: false,
                    price: 0, // Zero out price for secondary plots in bundle
                    ownership_type: ownership
                })
                .eq('id', plot.id);

            if (updateSecError) console.error(`   ❌ Error updating secondary ${plot.cadastral_number}:`, updateSecError);
            else console.log(`   ✅ Updated Secondary: ${plot.cadastral_number}`);
        }
    }
}

main().catch(console.error);
