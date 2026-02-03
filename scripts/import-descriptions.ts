#!/usr/bin/env npx tsx
/**
 * Импорт описаний участков из CSV файла
 * 
 * Формат CSV:
 * cadastral_number,description
 * 39:03:060007:602,"Описание участка здесь"
 */

import { createClient } from "@supabase/supabase-js"
import * as path from 'path'
import * as fs from 'fs'

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
        const trimmed = String(line || '').trim()
        if (!trimmed || trimmed.startsWith('#')) return
        const match = trimmed.match(/^([^=]+)=(.*)$/)
        if (!match) return
        const key = match[1].trim()
        let val = match[2]
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
        }
        if (key && process.env[key] === undefined) process.env[key] = val
    })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Простой парсер CSV с поддержкой кавычек
function parseCSV(content: string): Record<string, string>[] {
    const lines = content.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []

    const headers = parseCSVLine(lines[0])
    const rows: Record<string, string>[] = []

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
            row[h.trim()] = values[idx] || ''
        })
        rows.push(row)
    }
    return rows
}

function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current)
            current = ''
        } else {
            current += char
        }
    }
    result.push(current)
    return result
}

async function main() {
    const csvPath = process.argv[2] || path.resolve(process.cwd(), 'plots-with-descriptions.csv')

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Файл не найден: ${csvPath}`)
        console.log(`\nИспользование: npx tsx scripts/import-descriptions.ts [путь-к-csv]`)
        console.log(`\nФормат CSV (минимум 2 колонки):`)
        console.log(`  cadastral_number,description`)
        console.log(`  39:03:060007:602,"Описание участка"`)
        process.exit(1)
    }

    console.log(`📂 Чтение файла: ${csvPath}`)
    const content = fs.readFileSync(csvPath, 'utf8')
    const rows = parseCSV(content)

    console.log(`📋 Найдено ${rows.length} записей`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const row of rows) {
        const cadastral = row['cadastral_number']?.trim()
        const description = row['description']?.trim()

        if (!cadastral) {
            skipped++
            continue
        }

        if (!description) {
            skipped++
            continue
        }

        const { error } = await supabase
            .from('land_plots')
            .update({ description })
            .eq('cadastral_number', cadastral)

        if (error) {
            console.error(`❌ Ошибка для ${cadastral}: ${error.message}`)
            errors++
        } else {
            console.log(`✅ ${cadastral}`)
            updated++
        }
    }

    console.log(`\n📊 Результат:`)
    console.log(`   ✅ Обновлено: ${updated}`)
    console.log(`   ⏭️  Пропущено (нет описания): ${skipped}`)
    console.log(`   ❌ Ошибок: ${errors}`)
}

main()
