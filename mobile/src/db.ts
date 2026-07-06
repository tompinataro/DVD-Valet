import * as SQLite from 'expo-sqlite';
import { STARTUP_TIMEOUT_MS, withTimeout } from './startup';

export type QueuedUpc = {
  upc: string;
  first_scanned_at: string;
  last_scanned_at: string;
};

export type AuthSession = {
  email: string;
  name: string;
  signed_in_at: string;
};

export type DisplayProfile = {
  first_name: string;
  updated_at: string;
};

const DB_NAME = 'dvd_valet.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = withTimeout(SQLite.openDatabaseAsync(DB_NAME), STARTUP_TIMEOUT_MS, 'Opening local database')
      .catch((error) => {
        dbPromise = null;
        throw error;
      });
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
    CREATE TABLE IF NOT EXISTS auth_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      signed_in_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS display_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      first_name TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

export async function getStoredSession(): Promise<AuthSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AuthSession>(
    `SELECT email, name, signed_in_at
     FROM auth_session
     WHERE id = 1;`
  );
  return row ?? null;
}

export async function saveSession(session: AuthSession) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO auth_session (id, email, name, signed_in_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       name = excluded.name,
       signed_in_at = excluded.signed_in_at;`,
    [session.email, session.name, session.signed_in_at]
  );
}

export async function clearSession() {
  const db = await getDb();
  await db.runAsync(`DELETE FROM auth_session WHERE id = 1;`);
}

export async function getDisplayProfile(): Promise<DisplayProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DisplayProfile>(
    `SELECT first_name, updated_at
     FROM display_profile
     WHERE id = 1;`
  );
  return row ?? null;
}

export async function saveFirstName(firstNameRaw: string) {
  const firstName = firstNameRaw.trim().split(/\s+/)[0] ?? '';
  if (!firstName) {
    throw new Error('Enter a first name to continue.');
  }

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO display_profile (id, first_name, updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       first_name = excluded.first_name,
       updated_at = excluded.updated_at;`,
    [firstName, new Date().toISOString()]
  );
}
