require('dotenv').config({ path: '.env' });
const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('DATABASE_URL or POSTGRES_URL is not set in .env');
    process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigration() {
    const sqlPath = path.join(__dirname, '../migrations/add_about_company_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration from:', sqlPath);

    try {
        const client = await pool.connect();
        try {
            await client.query(sql);
            console.log('Migration applied successfully.');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error applying migration:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
