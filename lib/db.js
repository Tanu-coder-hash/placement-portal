// PostgreSQL access layer (node-postgres).
// NOTE: files under lib/ use relative imports only so the same code runs
// inside Next.js and in the plain-Node scripts (seed, setup).
import pg from 'pg';

const { Pool, types } = pg;

// Return numbers instead of strings for BIGINT (count(*)) and NUMERIC columns,
// and keep DATE columns as 'YYYY-MM-DD' strings (avoids time-zone shifts).
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(1082, (v) => v);

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }
  const pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
  });
  pool.on('error', (err) => console.error('[db] idle client error', err));
  return pool;
}

/** Lazily-created singleton pool (survives hot reloads in development). */
export function getPool() {
  if (!globalThis.__placementPortalPool) {
    globalThis.__placementPortalPool = createPool();
  }
  return globalThis.__placementPortalPool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

/** First row or null. */
export async function one(text, params = []) {
  const { rows } = await query(text, params);
  return rows[0] ?? null;
}

/** All rows. */
export async function many(text, params = []) {
  const { rows } = await query(text, params);
  return rows;
}

/**
 * Runs `fn(client)` inside BEGIN ... COMMIT on a dedicated connection.
 * Any thrown error triggers ROLLBACK, so the unit of work is atomic.
 *
 * ctx.userId / ctx.role are exposed to triggers through transaction-local
 * settings (app.user_id, app.user_role) for auditing and permission checks.
 */
export async function withTransaction(fn, ctx = {}) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (ctx.isolationLevel) {
      const level = String(ctx.isolationLevel).toUpperCase();
      if (!['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'].includes(level)) {
        throw new Error(`Unsupported isolation level: ${ctx.isolationLevel}`);
      }
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${level}`);
    }
    if (ctx.userId) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [String(ctx.userId)]);
    }
    if (ctx.role) {
      await client.query("SELECT set_config('app.user_role', $1, true)", [ctx.role]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[db] rollback failed', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Sets the note recorded by the status-history trigger for the rest of the transaction. */
export async function setStatusNote(client, note) {
  await client.query("SELECT set_config('app.status_note', $1, true)", [note || '']);
}

export async function closePool() {
  if (globalThis.__placementPortalPool) {
    await globalThis.__placementPortalPool.end();
    globalThis.__placementPortalPool = undefined;
  }
}
