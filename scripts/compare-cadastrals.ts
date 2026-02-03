/**
 * Compare cadastral numbers between dump.sql (old DB) and current Supabase DB
 * Run: npx tsx scripts/compare-cadastrals.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface DumpPlot {
    id: number;
    cadastral_number: string;
    area: number;
    address: string;
    price_public: number | null;
    status: string;
    comment: string | null;
}

async function extractFromDump(): Promise<DumpPlot[]> {
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

    const plots: DumpPlot[] = [];

    for (const line of lines) {
        const parts = line.split('\t');
        // Format: id, listing_id, cadastral_number, land_use_id, land_category_id, area, address, polygon, centroid, price_public, price_per_sotka, price_private, price_per_sotka_private, status, owner_id, comment, created_at, updated_at
        if (parts.length >= 16) {
            const cadastral = parts[2];
            if (cadastral && cadastral !== '\\N' && cadastral.startsWith('39:')) {
                plots.push({
                    id: parseInt(parts[0]),
                    cadastral_number: cadastral,
                    area: parseFloat(parts[5]) || 0,
                    address: parts[6] !== '\\N' ? parts[6] : '',
                    price_public: parts[9] !== '\\N' ? parseInt(parts[9]) : null,
                    status: parts[13],
                    comment: parts[15] !== '\\N' ? parts[15] : null,
                });
            }
        }
    }

    return plots;
}

async function fetchCurrentPlots(): Promise<Map<string, any>> {
    const { data, error } = await supabase
        .from('land_plots')
        .select('cadastral_number, title, price, area_sotok, district, location, is_active, ownership_type, bundle_id')
        .not('cadastral_number', 'is', null);

    if (error) {
        console.error('Error fetching current plots:', error);
        return new Map();
    }

    const map = new Map<string, any>();
    for (const plot of data || []) {
        if (plot.cadastral_number) {
            map.set(plot.cadastral_number, plot);
        }
    }
    return map;
}

async function main() {
    console.log('='.repeat(60));
    console.log('СРАВНЕНИЕ КАДАСТРОВЫХ НОМЕРОВ');
    console.log('dump.sql (старая БД) vs Supabase (текущая БД)');
    console.log('='.repeat(60));
    console.log('');

    // Extract from dump.sql
    console.log('📂 Извлекаем данные из dump.sql...');
    const dumpPlots = await extractFromDump();
    console.log(`   Найдено участков: ${dumpPlots.length}`);

    // Fetch from current DB
    console.log('🌐 Загружаем данные из текущей БД...');
    const currentPlots = await fetchCurrentPlots();
    console.log(`   Найдено участков: ${currentPlots.size}`);
    console.log('');

    // Compare
    const onlyInDump: DumpPlot[] = [];
    const inBoth: { dump: DumpPlot; current: any }[] = [];
    const onlyInCurrent: string[] = [];

    // Stats by ownership type
    const dumpOwnership = { ownership: 0, lease: 0, unknown: 0 };
    const dumpBundles: string[] = [];

    for (const plot of dumpPlots) {
        // Analyze ownership from comment
        const comment = plot.comment?.toLowerCase() || '';
        if (comment.includes('аренда')) {
            dumpOwnership.lease++;
        } else if (comment.includes('собственность')) {
            dumpOwnership.ownership++;
        } else {
            dumpOwnership.unknown++;
        }

        // Check for bundles
        if (comment.includes('продается вместе') || comment.includes('единым лотом')) {
            dumpBundles.push(plot.cadastral_number);
        }

        if (currentPlots.has(plot.cadastral_number)) {
            inBoth.push({ dump: plot, current: currentPlots.get(plot.cadastral_number) });
            currentPlots.delete(plot.cadastral_number);
        } else {
            onlyInDump.push(plot);
        }
    }

    // Remaining are only in current
    for (const cadastral of currentPlots.keys()) {
        onlyInCurrent.push(cadastral);
    }

    // Print report
    console.log('='.repeat(60));
    console.log('ОТЧЕТ');
    console.log('='.repeat(60));
    console.log('');

    console.log(`📊 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`   Участков в dump.sql:           ${dumpPlots.length}`);
    console.log(`   Участков в текущей БД:         ${currentPlots.size + inBoth.length}`);
    console.log(`   Совпадают (есть в обеих):      ${inBoth.length}`);
    console.log(`   Только в dump.sql:             ${onlyInDump.length}`);
    console.log(`   Только в текущей БД:           ${onlyInCurrent.length}`);
    console.log('');

    console.log(`📋 ВИД ПРАВА (по данным dump.sql):`);
    console.log(`   Собственность:                 ${dumpOwnership.ownership}`);
    console.log(`   Аренда:                        ${dumpOwnership.lease}`);
    console.log(`   Не указано:                    ${dumpOwnership.unknown}`);
    console.log('');

    console.log(`🔗 ПАКЕТЫ (продаются вместе):     ${dumpBundles.length} участков`);
    console.log('');

    if (onlyInDump.length > 0) {
        console.log('='.repeat(60));
        console.log(`❌ УЧАСТКИ ТОЛЬКО В DUMP.SQL (${onlyInDump.length}):`);
        console.log('   (Отсутствуют в текущей БД - можно добавить)');
        console.log('-'.repeat(60));
        for (const plot of onlyInDump.slice(0, 20)) {
            const ownershipType = plot.comment?.toLowerCase().includes('аренда') ? 'Аренда' : 'Собств.';
            console.log(`   ${plot.cadastral_number} | ${plot.area} сот. | ${plot.price_public || 'N/A'} ₽ | ${ownershipType}`);
        }
        if (onlyInDump.length > 20) {
            console.log(`   ... и еще ${onlyInDump.length - 20} участков`);
        }
        console.log('');
    }

    if (onlyInCurrent.length > 0) {
        console.log('='.repeat(60));
        console.log(`➕ УЧАСТКИ ТОЛЬКО В ТЕКУЩЕЙ БД (${onlyInCurrent.length}):`);
        console.log('   (Добавлены после dump.sql)');
        console.log('-'.repeat(60));
        for (const cadastral of onlyInCurrent.slice(0, 20)) {
            console.log(`   ${cadastral}`);
        }
        if (onlyInCurrent.length > 20) {
            console.log(`   ... и еще ${onlyInCurrent.length - 20} участков`);
        }
        console.log('');
    }

    // Save detailed report to file
    const reportPath = path.join(process.cwd(), 'cadastral_comparison_report.json');
    const report = {
        generated_at: new Date().toISOString(),
        summary: {
            total_in_dump: dumpPlots.length,
            total_in_current: currentPlots.size + inBoth.length,
            matching: inBoth.length,
            only_in_dump: onlyInDump.length,
            only_in_current: onlyInCurrent.length,
        },
        ownership_stats: dumpOwnership,
        bundles_count: dumpBundles.length,
        only_in_dump: onlyInDump.map(p => ({
            cadastral: p.cadastral_number,
            area: p.area,
            price: p.price_public,
            comment: p.comment,
        })),
        only_in_current: onlyInCurrent,
        bundles: dumpBundles,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`💾 Детальный отчет сохранен: ${reportPath}`);
}

main().catch(console.error);
