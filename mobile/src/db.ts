import * as SQLite from 'expo-sqlite';
import { STARTUP_TIMEOUT_MS, withTimeout } from './startup';

export type QueuedUpc = {
  upc: string;
  first_scanned_at: string;
  last_scanned_at: string;
  title: string | null;
  subtitle: string | null;
  brand: string | null;
  format: string | null;
  image_url: string | null;
  lookup_status: UpcLookupStatus;
  lookup_source: string | null;
  lookup_error: string | null;
  metadata_updated_at: string | null;
};

export type UpcLookupStatus = 'pending' | 'found' | 'not_found' | 'failed';

export type UpcMetadataInput = {
  title: string;
  subtitle?: string | null;
  brand?: string | null;
  format?: string | null;
  imageUrl?: string | null;
  source: string;
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

  await ensureUpcMetadataColumns(db);
}

async function ensureColumn(db: SQLite.SQLiteDatabase, tableName: string, columnName: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
  if (columns.some((column) => column.name === columnName)) return;
  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
}

async function ensureUpcMetadataColumns(db: SQLite.SQLiteDatabase) {
  await ensureColumn(db, 'upc_queue', 'title', 'TEXT');
  await ensureColumn(db, 'upc_queue', 'subtitle', 'TEXT');
  await ensureColumn(db, 'upc_queue', 'brand', 'TEXT');
  await ensureColumn(db, 'upc_queue', 'format', 'TEXT');
  await ensureColumn(db, 'upc_queue', 'image_url', 'TEXT');
  await ensureColumn(db, 'upc_queue', 'lookup_status', `TEXT NOT NULL DEFAULT 'pending'`);
  await ensureColumn(db, 'upc_queue', 'lookup_source', 'TEXT');
  await ensureColumn(db, 'upc_queue', 'lookup_error', 'TEXT');
  await ensureColumn(db, 'upc_queue', 'metadata_updated_at', 'TEXT');
}

export async function upsertUpc(upcRaw: string) {
  const upc = upcRaw.trim();
  if (!upc) return;

  const db = await getDb();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO upc_queue (upc, first_scanned_at, last_scanned_at, lookup_status)
     VALUES (?, ?, ?, 'pending')
     ON CONFLICT(upc) DO UPDATE SET last_scanned_at = excluded.last_scanned_at;`,
    [upc, now, now]
  );
}

export async function saveUpcMetadata(upcRaw: string, metadata: UpcMetadataInput) {
  const upc = upcRaw.trim();
  if (!upc) return;

  const db = await getDb();
  await db.runAsync(
    `UPDATE upc_queue
     SET title = ?,
       subtitle = ?,
       brand = ?,
       format = ?,
       image_url = ?,
       lookup_status = 'found',
       lookup_source = ?,
       lookup_error = NULL,
       metadata_updated_at = ?
     WHERE upc = ?;`,
    [
      metadata.title,
      metadata.subtitle ?? null,
      metadata.brand ?? null,
      metadata.format ?? null,
      metadata.imageUrl ?? null,
      metadata.source,
      new Date().toISOString(),
      upc,
    ]
  );
}

export async function markUpcLookupNotFound(upcRaw: string) {
  const upc = upcRaw.trim();
  if (!upc) return;

  const db = await getDb();
  await db.runAsync(
    `UPDATE upc_queue
     SET lookup_status = 'not_found',
       lookup_source = NULL,
       lookup_error = NULL,
       metadata_updated_at = ?
     WHERE upc = ?;`,
    [new Date().toISOString(), upc]
  );
}

export async function markUpcLookupFailed(upcRaw: string, errorMessage: string) {
  const upc = upcRaw.trim();
  if (!upc) return;

  const db = await getDb();
  await db.runAsync(
    `UPDATE upc_queue
     SET lookup_status = 'failed',
       lookup_error = ?,
       metadata_updated_at = ?
     WHERE upc = ?;`,
    [errorMessage, new Date().toISOString(), upc]
  );
}

export async function listQueuedUpcs(): Promise<QueuedUpc[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<QueuedUpc>(
    `SELECT upc, first_scanned_at, last_scanned_at, title, subtitle, brand, format, image_url,
       lookup_status, lookup_source, lookup_error, metadata_updated_at
     FROM upc_queue
     ORDER BY last_scanned_at DESC;`
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
