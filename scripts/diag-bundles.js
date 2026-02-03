import fs from 'fs';

const plots = JSON.parse(fs.readFileSync('/Users/lexa/Documents/Python/rkkland/backup_data/land_plots.json', 'utf8'));

const bundles = new Map();

plots.forEach(p => {
    if (p.bundle_id) {
        if (!bundles.has(p.bundle_id)) {
            bundles.set(p.bundle_id, []);
        }
        bundles.get(p.bundle_id).push(p);
    }
});

console.log(`Found ${bundles.size} bundles.`);

for (const [id, bundlePlots] of bundles.entries()) {
    const hasPrimary = bundlePlots.some(p => p.is_bundle_primary);
    const names = bundlePlots.map(p => p.cadastral_number).join(', ');
    const statuses = bundlePlots.map(p => `${p.cadastral_number}: ${p.ownership_type}`).join(', ');

    if (!hasPrimary) {
        console.log(`Bundle ${id} has NO primary plot! Plots: ${names}`);
    } else if (bundlePlots.length === 1) {
        console.log(`Bundle ${id} has ONLY ONE plot: ${names}`);
    } else {
        // Check if all plots have coordinates
        const missingCoords = bundlePlots.filter(p => !p.coordinates_json);
        if (missingCoords.length > 0) {
            console.log(`Bundle ${id} has plots missing coordinates: ${missingCoords.map(p => p.cadastral_number).join(', ')}`);
        }

        // Check for mixed statuses
        const ownershipTypes = new Set(bundlePlots.map(p => p.ownership_type));
        if (ownershipTypes.size > 1) {
            console.log(`Bundle ${id} has MIXED ownership types: ${statuses}`);
        }
    }
}

// Specifically check for 39:03:091001:861 lot
const targetLot = plots.find(p => p.cadastral_number === '39:03:091001:1139')?.bundle_id;
if (targetLot) {
    console.log(`\nDiagnostic for target lot ${targetLot}:`);
    const lotPlots = bundles.get(targetLot);
    lotPlots.forEach(p => {
        console.log(`- ${p.cadastral_number}: primary=${p.is_bundle_primary}, active=${p.is_active}, ownership=${p.ownership_type}, has_coords=${!!p.coordinates_json}`);
    });
}
