import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

import { migrateShapePhotos } from "@/lib/photo";
import type { BodyRecord, Dish, Food, LogMap, Profile } from "@/types";

/**
 * The slice of app state that is persisted to disk.
 * UI/navigation state is intentionally excluded.
 */
export interface PersistShape {
  profile: Profile;
  logs: LogMap;
  foods: Food[];
  dishes: Dish[];
  extraBody: BodyRecord[];
}

const DB_NAME = "macrotrack.db";
const SCHEMA_VERSION = 1;

/** Legacy AsyncStorage key (pre-SQLite). Migrated once, then left untouched as a safety copy. */
const LEGACY_KEY = "macrotrack:v1";

// Row keys inside the kv table.
const K_STATE = "state";
const K_BACKUP = "state_backup";
const K_CORRUPT = "state_corrupt";
const K_VERSION = "schema_version";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Open (once) a durable, WAL-mode SQLite database with a simple key/value table.
 * SQLite lives in the app's sandboxed document storage — it survives app updates
 * and is never touched by cache eviction, unlike a bare AsyncStorage blob.
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      // WAL gives atomic, durable commits and far better crash resilience.
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);",
      );
      return db;
    })();
  }
  return dbPromise;
}

async function readRow(db: SQLite.SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM kv WHERE key = ?;",
    [key],
  );
  return row ? row.value : null;
}

function parseShape(raw: string | null): PersistShape | null {
  if (!raw) return null;
  const data = JSON.parse(raw) as Partial<PersistShape>;
  // Minimal structural validation — guards against truncated / foreign blobs.
  if (!data || typeof data !== "object" || !data.profile) return null;
  return {
    profile: data.profile as Profile,
    logs: (data.logs ?? {}) as LogMap,
    foods: (data.foods ?? []) as Food[],
    dishes: (data.dishes ?? []) as Dish[],
    extraBody: (data.extraBody ?? []) as BodyRecord[],
  };
}

/**
 * Load persisted state. Resolution order:
 *   1. Current SQLite `state` row.
 *   2. SQLite `state_backup` row (recovers from a corrupt latest write).
 *   3. One-time migration from the legacy AsyncStorage blob.
 *   4. null  → caller falls back to seed data.
 *
 * On corruption the bad blob is preserved under `state_corrupt` for diagnostics,
 * never silently discarded.
 */
export async function loadState(): Promise<PersistShape | null> {
  const db = await getDb();

  // 1 + 2: try current, then backup.
  const current = await readRow(db, K_STATE);
  if (current != null) {
    try {
      const parsed = parseShape(current);
      if (parsed) return parsed;
      throw new Error("invalid shape");
    } catch {
      // Latest write is unreadable — quarantine it and try the backup.
      try {
        await db.runAsync(
          "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);",
          [K_CORRUPT, current],
        );
      } catch {
        /* best effort */
      }
      const backup = await readRow(db, K_BACKUP);
      try {
        const parsed = parseShape(backup);
        if (parsed) return parsed;
      } catch {
        /* fall through to legacy / seed */
      }
      return null;
    }
  }

  // 3: legacy AsyncStorage migration (existing installs upgrading to SQLite).
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    const parsed = parseShape(legacy);
    if (parsed) {
      const migrated = await migrateShapePhotos(parsed);
      await saveState(migrated);
      return migrated;
    }
  } catch {
    /* ignore — no legacy data */
  }

  return null;
}

/**
 * Persist state atomically. The previous good value is rotated into `state_backup`
 * within the same transaction, so a future corrupt/partial write is always
 * recoverable. Photos are stored as files elsewhere — this blob only holds
 * lightweight references, so it stays small and well within SQLite limits.
 *
 * Throws on failure so callers can surface/retry rather than lose data silently.
 */
export async function saveState(data: PersistShape): Promise<void> {
  const db = await getDb();
  const value = JSON.stringify(data);
  await db.withTransactionAsync(async () => {
    const prev = await readRow(db, K_STATE);
    if (prev != null) {
      await db.runAsync(
        "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);",
        [K_BACKUP, prev],
      );
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);",
      [K_STATE, value],
    );
    await db.runAsync(
      "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?);",
      [K_VERSION, String(SCHEMA_VERSION)],
    );
  });
}
