import * as SQLite from 'expo-sqlite';

export type QueuedUpc = {
  upc: string;
  first_scanned_at: string;
  last_scanned_at: string;
};

const DB_NAME = 'dvd_valet.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function ensureSchema() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS upc_queue (
      upc TEXT PRIMARY KEY,
      first_scanned_at TEXT NOT NULL,
      last_scanned_at TEXT NOT NULL
    );
  `);
}

export async function upsertUpc(upcRaw: string) {
  const upc = upcRaw.trim();
  if (!upc) return;

  const db = await getDb();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO upc_queue (upc, first_scanned_at, last_scanned_at)
     VALUES (?, ?, ?)
     ON CONFLICT(upc) DO UPDATE SET last_scanned_at = excluded.last_scanned_at;`,
    [upc, now, now]
  );
}

export async function listQueuedUpcs(): Promise<QueuedUpc[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<QueuedUpc>(
    `SELECT upc, first_scanned_at, last_scanned_at
     FROM upc_queue
     ORDER BY upc ASC;`
  );
  return rows;
}

export async function countQueuedUpcs(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM upc_queue;`
  );
  return row?.count ?? 0;
}
