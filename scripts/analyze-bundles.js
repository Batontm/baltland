/**
 * Analyze bundled plots from dump.sql
 * Run: node scripts/analyze-bundles.js
 */

const fs = require('fs');
const path = require('path');

function extractBundles() {
    const dumpPath = path.join(process.cwd(), 'dump.sql');
    const content = fs.readFileSync(dumpPath, 'utf-8');

    // Find the COPY block for plots table
    const copyMatch = content.match(/COPY public\.plots \([^)]+\) FROM stdin;([\s\S]*?)\\\./);
    if (!copyMatch) {
        console.error('Could not find plots COPY block in dump.sql');
        return [];
    }

    const dataBlock = copyMatch[1].trim();
    const lines = dataBlock.split('\n').filter(line => line.trim());

    const bundles = [];

    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 16) {
            const cadastral = parts[2];
            const comment = parts[15] !== '\\N' ? parts[15] : '';
            const pricePublic = parts[9] !== '\\N' ? parseInt(parts[9]) : null;
            const area = parseFloat(parts[5]) || 0;

            // Check for bundle indicators
            const lowerComment = comment.toLowerCase();
            if (lowerComment.includes('продается вместе') ||
                lowerComment.includes('единым лотом') ||
                lowerComment.includes('продаются вместе')) {

                // Extract related cadastral numbers from comment
                const relatedCadastrals = [];

                // Pattern: "39:03:040028:693" or ":693"
                const fullMatches = comment.match(/39:\d{2}:\d{6}:\d+/g);
                if (fullMatches) {
                    relatedCadastrals.push(...fullMatches);
                }

                // Pattern: ":693", ":694" etc. - short references
                const shortMatches = comment.match(/:(\d{3,4})/g);
                if (shortMatches && cadastral) {
                    const prefix = cadastral.substring(0, cadastral.lastIndexOf(':') + 1);
                    for (const match of shortMatches) {
                        const num = match.substring(1);
                        const fullCadastral = prefix + num;
                        if (!relatedCadastrals.includes(fullCadastral) && fullCadastral !== cadastral) {
                            relatedCadastrals.push(fullCadastral);
                        }
                    }
                }

                bundles.push({
                    cadastral_number: cadastral,
                    area: area,
                    price: pricePublic,
                    comment: comment,
                    related_cadastrals: relatedCadastrals.filter(c => c !== cadastral),
                });
            }
        }
    }

    return bundles;
}

function groupBundles(bundles) {
    // Group related plots into bundles
    const bundleGroups = [];
    const processed = new Set();

    for (const plot of bundles) {
        if (processed.has(plot.cadastral_number)) continue;

        const group = new Set([plot.cadastral_number]);

        // Add related cadastrals
        for (const related of plot.related_cadastrals) {
            group.add(related);
        }

        // Find other plots that reference any of these cadastrals
        for (const otherPlot of bundles) {
            if (group.has(otherPlot.cadastral_number)) {
                for (const rel of otherPlot.related_cadastrals) {
                    group.add(rel);
                }
            }
            for (const rel of otherPlot.related_cadastrals) {
                if (group.has(rel)) {
                    group.add(otherPlot.cadastral_number);
                    for (const r2 of otherPlot.related_cadastrals) {
                        group.add(r2);
                    }
                }
            }
        }

        // Mark all as processed
        for (const cad of group) {
            processed.add(cad);
        }

        // Find details for all plots in group
        const groupDetails = Array.from(group).map(cad => {
            const found = bundles.find(b => b.cadastral_number === cad);
            return found || { cadastral_number: cad, area: null, price: null, comment: null };
        });

        bundleGroups.push({
            plots: groupDetails,
            total_area: groupDetails.reduce((sum, p) => sum + (p.area || 0), 0),
            price: groupDetails[0]?.price || null,
        });
    }

    return bundleGroups;
}

async function main() {
    console.log('='.repeat(70));
    console.log('АНАЛИЗ ПАКЕТОВ (участки, продающиеся вместе) из dump.sql');
    console.log('='.repeat(70));
    console.log('');

    const bundles = extractBundles();
    console.log(`📦 Найдено участков с пометкой "продается вместе": ${bundles.length}`);
    console.log('');

    const groups = groupBundles(bundles);
    console.log(`🔗 Сформировано пакетов: ${groups.length}`);
    console.log('');

    console.log('='.repeat(70));
    console.log('ДЕТАЛИ ПАКЕТОВ');
    console.log('='.repeat(70));
    console.log('');

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        console.log(`📦 ПАКЕТ #${i + 1} (${group.plots.length} участков)`);
        console.log(`   Общая площадь: ${group.total_area} сот.`);
        console.log(`   Цена: ${group.price ? group.price.toLocaleString() + ' ₽' : 'N/A'}`);
        console.log('   Участки:');
        for (const plot of group.plots) {
            console.log(`     - ${plot.cadastral_number} | ${plot.area || '?'} сот.`);
        }
        if (group.plots[0]?.comment) {
            console.log(`   Примечание: ${group.plots[0].comment.substring(0, 80)}...`);
        }
        console.log('');
    }

    // Save to JSON
    const reportPath = path.join(process.cwd(), 'bundle_analysis_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(groups, null, 2), 'utf-8');
    console.log(`💾 Отчет сохранен: ${reportPath}`);
}

main().catch(console.error);
