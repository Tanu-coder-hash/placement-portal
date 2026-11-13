// Creates (or re-creates) the whole database schema.
//   npm run db:setup
// WARNING: runs db/00_reset.sql first, which drops all portal tables and data.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, getPool } from '../lib/db.js';

const DB_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db');
const FILES = ['00_reset.sql', '01_schema.sql', '02_triggers.sql', '03_procedures.sql', '04_views.sql', '05_reference_data.sql'];

async function main() {
  const pool = getPool();
  const client = await pool.connect();
  client.on('notice', () => {}); // silence "does not exist, skipping" notices
  try {
    const { rows } = await client.query('SELECT version()');
    console.log(`Connected: ${rows[0].version.split(',')[0]}`);
    for (const file of FILES) {
      const sql = await fs.readFile(path.join(DB_DIR, file), 'utf8');
      process.stdout.write(`  running ${file} ... `);
      await client.query(sql);
      console.log('ok');
    }
    const ext = await client.query("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
    console.log(`\npgvector ${ext.rows[0]?.extversion ?? '?'} enabled. Schema ready.`);
    console.log('Next: npm run db:seed   (loads demo data and builds the vector index)');
  } catch (err) {
    console.error('\nFAILED:', err.message);
    if (/extension "vector"|vector\.control/.test(err.message)) {
      console.error(
        '\nThe pgvector extension is not installed on this PostgreSQL server.\n' +
          '  - Easiest: `docker compose up -d` (uses the pgvector/pgvector:pg16 image)\n' +
          '  - Or install it: https://github.com/pgvector/pgvector#installation',
      );
    }
    if (err.code === 'ECONNREFUSED' || err.code === '28P01' || err.code === '3D000') {
      console.error('\nCheck that PostgreSQL is running and DATABASE_URL in .env is correct.');
    }
    process.exitCode = 1;
  } finally {
    client.release();
    await closePool();
  }
}

main();
