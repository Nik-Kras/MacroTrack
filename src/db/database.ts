import * as SQLite from 'expo-sqlite';
import { seedFoods, seedProfile } from '../data/seed';
import { localDateKey, isoDaysAgo } from '../lib/dates';
import { createLogger, logDuration } from '../lib/logger';
import { addMacros, macrosForGrams } from '../lib/math';
import { BodyRecord, CustomDish, Food, LogEntry, MacroTotals, Profile } from '../types';

export type MacroDatabase = SQLite.SQLiteDatabase;

const logger = createLogger('db');

export async function openMacroDb() {
  return logDuration('db', 'open macro database', async () => {
    const db = await SQLite.openDatabaseAsync('macrotrack.db');
    await migrate(db);
    return db;
  });
}

async function migrate(db: MacroDatabase) {
  logger.info('migration check started');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  logger.info('database version read', { user_version: version?.user_version ?? 0 });
  if ((version?.user_version ?? 0) >= 1) {
    logger.info('migration skipped');
    return;
  }

  logger.info('schema migration started');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS food (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('PRODUCT','DISH')),
      is_seed INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      name TEXT NOT NULL,
      name_ua TEXT,
      aliases TEXT,
      aliases_ua TEXT,
      kcal REAL NOT NULL,
      protein_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      low_kcal INTEGER NOT NULL DEFAULT 0,
      high_kcal INTEGER NOT NULL DEFAULT 0,
      low_fat INTEGER NOT NULL DEFAULT 0,
      high_fat INTEGER NOT NULL DEFAULT 0,
      low_protein INTEGER NOT NULL DEFAULT 0,
      high_protein INTEGER NOT NULL DEFAULT 0,
      low_carbs INTEGER NOT NULL DEFAULT 0,
      high_carbs INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_food_kind ON food(kind);
    CREATE INDEX IF NOT EXISTS idx_food_name ON food(name);
    CREATE VIRTUAL TABLE IF NOT EXISTS food_fts USING fts5(
      name, name_ua, aliases, aliases_ua,
      content='food', content_rowid='id'
    );
    CREATE TRIGGER IF NOT EXISTS food_ai AFTER INSERT ON food BEGIN
      INSERT INTO food_fts(rowid, name, name_ua, aliases, aliases_ua)
      VALUES (new.id, new.name, new.name_ua, new.aliases, new.aliases_ua);
    END;
    CREATE TRIGGER IF NOT EXISTS food_ad AFTER DELETE ON food BEGIN
      INSERT INTO food_fts(food_fts, rowid, name, name_ua, aliases, aliases_ua)
      VALUES('delete', old.id, old.name, old.name_ua, old.aliases, old.aliases_ua);
    END;
    CREATE TRIGGER IF NOT EXISTS food_au AFTER UPDATE ON food BEGIN
      INSERT INTO food_fts(food_fts, rowid, name, name_ua, aliases, aliases_ua)
      VALUES('delete', old.id, old.name, old.name_ua, old.aliases, old.aliases_ua);
      INSERT INTO food_fts(rowid, name, name_ua, aliases, aliases_ua)
      VALUES (new.id, new.name, new.name_ua, new.aliases, new.aliases_ua);
    END;

    CREATE TABLE IF NOT EXISTS custom_dish (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      name_ua TEXT,
      photo_uri TEXT,
      servings INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 1),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS custom_dish_ingredient (
      id INTEGER PRIMARY KEY,
      dish_id INTEGER NOT NULL REFERENCES custom_dish(id) ON DELETE CASCADE,
      food_id INTEGER NOT NULL REFERENCES food(id),
      grams REAL NOT NULL CHECK (grams >= 0),
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cdi_dish ON custom_dish_ingredient(dish_id);
    CREATE VIEW IF NOT EXISTS custom_dish_macros AS
      SELECT d.id AS dish_id, d.servings,
             COALESCE(SUM(f.kcal * i.grams / 100.0), 0) AS total_kcal,
             COALESCE(SUM(f.protein_g * i.grams / 100.0), 0) AS total_protein_g,
             COALESCE(SUM(f.fat_g * i.grams / 100.0), 0) AS total_fat_g,
             COALESCE(SUM(f.carbs_g * i.grams / 100.0), 0) AS total_carbs_g
      FROM custom_dish d
      LEFT JOIN custom_dish_ingredient i ON i.dish_id = d.id
      LEFT JOIN food f ON f.id = i.food_id
      GROUP BY d.id, d.servings;

    CREATE TABLE IF NOT EXISTS log_entry (
      id INTEGER PRIMARY KEY,
      log_date TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('FOOD','DISH')),
      food_id INTEGER REFERENCES food(id),
      custom_dish_id INTEGER REFERENCES custom_dish(id),
      grams REAL,
      servings_used REAL,
      kcal REAL NOT NULL,
      protein_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      carbs_g REAL NOT NULL,
      photo_uri TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (
        (source_type = 'FOOD' AND food_id IS NOT NULL AND custom_dish_id IS NULL) OR
        (source_type = 'DISH' AND custom_dish_id IS NOT NULL AND food_id IS NULL)
      )
    );
    CREATE INDEX IF NOT EXISTS idx_log_date ON log_entry(log_date);

    CREATE TABLE IF NOT EXISTS body_record (
      id INTEGER PRIMARY KEY,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      weight_kg REAL,
      bicep_cm REAL,
      chest_cm REAL,
      waist_cm REAL,
      leg_both_cm REAL,
      single_leg_cm REAL,
      CHECK (weight_kg IS NOT NULL OR bicep_cm IS NOT NULL OR chest_cm IS NOT NULL
          OR waist_cm IS NOT NULL OR leg_both_cm IS NOT NULL OR single_leg_cm IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS idx_body_recorded_at ON body_record(recorded_at);

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      sex TEXT CHECK (sex IN ('male','female')),
      birth_date TEXT,
      height_cm REAL,
      activity_level TEXT CHECK (activity_level IN
        ('sedentary','lightly_active','moderately_active','very_active','extra_active')),
      goal_type TEXT CHECK (goal_type IN ('fat_loss','maintenance','muscle_gain')),
      desired_weight_kg REAL,
      desired_bicep_cm REAL,
      desired_chest_cm REAL,
      desired_waist_cm REAL,
      desired_leg_both_cm REAL,
      desired_single_leg_cm REAL,
      calorie_adjustment_pct REAL,
      protein_g_per_kg REAL,
      fat_g_per_kg REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  logger.info('schema migration completed');

  await seed(db);
  await db.execAsync('PRAGMA user_version = 1;');
  logger.info('database version updated', { user_version: 1 });
}

async function seed(db: MacroDatabase) {
  logger.info('seed check started');
  const foodCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM food;');
  if (!foodCount?.count) {
    logger.info('food seed started', { count: seedFoods.length });
    for (const food of seedFoods) {
      await db.runAsync(
        `INSERT INTO food
         (kind, is_seed, category, name, name_ua, aliases, aliases_ua, kcal, protein_g, fat_g, carbs_g,
          low_kcal, high_kcal, low_fat, high_fat, low_protein, high_protein, low_carbs, high_carbs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          food.kind,
          food.is_seed,
          food.category,
          food.name,
          food.name_ua,
          food.aliases,
          food.aliases_ua,
          food.kcal,
          food.protein_g,
          food.fat_g,
          food.carbs_g,
          food.low_kcal,
          food.high_kcal,
          food.low_fat,
          food.high_fat,
          food.low_protein,
          food.high_protein,
          food.low_carbs,
          food.high_carbs
        ]
      );
    }
    logger.info('food seed completed', { count: seedFoods.length });
  } else {
    logger.info('food seed skipped', { count: foodCount.count });
  }

  const profileCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM profile;');
  if (!profileCount?.count) {
    logger.info('profile seed started');
    await db.runAsync(
      `INSERT INTO profile
       (id, name, sex, birth_date, height_cm, activity_level, goal_type, desired_weight_kg,
        desired_bicep_cm, desired_chest_cm, desired_waist_cm, desired_leg_both_cm, desired_single_leg_cm,
        calorie_adjustment_pct, protein_g_per_kg, fat_g_per_kg)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seedProfile.name,
        seedProfile.sex,
        seedProfile.birth_date,
        seedProfile.height_cm,
        seedProfile.activity_level,
        seedProfile.goal_type,
        seedProfile.desired_weight_kg,
        seedProfile.desired_bicep_cm,
        seedProfile.desired_chest_cm,
        seedProfile.desired_waist_cm,
        seedProfile.desired_leg_both_cm,
        seedProfile.desired_single_leg_cm,
        seedProfile.calorie_adjustment_pct,
        seedProfile.protein_g_per_kg,
        seedProfile.fat_g_per_kg
      ]
    );
    await db.runAsync(
      `INSERT INTO body_record
       (recorded_at, weight_kg, bicep_cm, chest_cm, waist_cm, leg_both_cm, single_leg_cm)
       VALUES (?, 80, 36, 100, 86, 108, 55)`,
      [`${isoDaysAgo(21)}T08:00:00`]
    );
    await db.runAsync(
      `INSERT INTO body_record
       (recorded_at, weight_kg, bicep_cm, chest_cm, waist_cm, leg_both_cm, single_leg_cm)
       VALUES (?, 78.8, 36.5, 101, 84.5, 109, 55.5)`,
      [`${isoDaysAgo(7)}T08:00:00`]
    );
    logger.info('profile seed completed');
  } else {
    logger.info('profile seed skipped', { count: profileCount.count });
  }

  const dishCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM custom_dish;');
  if (!dishCount?.count) {
    logger.info('dish seed started');
    await db.runAsync(
      'INSERT INTO custom_dish (name, servings, notes) VALUES (?, ?, ?)',
      ['Chicken rice bowl', 2, 'Simple cutting staple']
    );
    const dish = await db.getFirstAsync<{ id: number }>('SELECT id FROM custom_dish WHERE name = ?', [
      'Chicken rice bowl'
    ]);
    const chicken = await db.getFirstAsync<{ id: number }>('SELECT id FROM food WHERE name = ?', [
      'Chicken breast'
    ]);
    const rice = await db.getFirstAsync<{ id: number }>('SELECT id FROM food WHERE name = ?', [
      'Cooked white rice'
    ]);
    if (dish && chicken && rice) {
      await db.runAsync(
        'INSERT INTO custom_dish_ingredient (dish_id, food_id, grams, position) VALUES (?, ?, ?, ?)',
        [dish.id, rice.id, 200, 0]
      );
      await db.runAsync(
        'INSERT INTO custom_dish_ingredient (dish_id, food_id, grams, position) VALUES (?, ?, ?, ?)',
        [dish.id, chicken.id, 300, 1]
      );
    }
    logger.info('dish seed completed', {
      dish_created: Boolean(dish),
      chicken_found: Boolean(chicken),
      rice_found: Boolean(rice)
    });
  } else {
    logger.info('dish seed skipped', { count: dishCount.count });
  }
}

export async function getProfile(db: MacroDatabase) {
  return logDuration('db', 'get profile', () => db.getFirstAsync<Profile>('SELECT * FROM profile WHERE id = 1'));
}

export async function getLatestBodyRecord(db: MacroDatabase) {
  return logDuration('db', 'get latest body record', () =>
    db.getFirstAsync<BodyRecord>('SELECT * FROM body_record ORDER BY recorded_at DESC LIMIT 1')
  );
}

export async function getBodyRecords(db: MacroDatabase) {
  return db.getAllAsync<BodyRecord>('SELECT * FROM body_record ORDER BY recorded_at ASC');
}

export async function addBodyRecord(db: MacroDatabase, record: Partial<Omit<BodyRecord, 'id' | 'recorded_at'>>) {
  await db.runAsync(
    `INSERT INTO body_record (weight_kg, bicep_cm, chest_cm, waist_cm, leg_both_cm, single_leg_cm)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      record.weight_kg ?? null,
      record.bicep_cm ?? null,
      record.chest_cm ?? null,
      record.waist_cm ?? null,
      record.leg_both_cm ?? null,
      record.single_leg_cm ?? null
    ]
  );
}

export async function searchFoods(db: MacroDatabase, query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return db.getAllAsync<Food>('SELECT * FROM food ORDER BY high_protein DESC, name ASC LIMIT 20');
  }
  const like = `%${trimmed}%`;
  return db.getAllAsync<Food>(
    `SELECT DISTINCT f.* FROM food f
     LEFT JOIN food_fts ON food_fts.rowid = f.id
     WHERE f.name LIKE ? OR f.name_ua LIKE ? OR f.aliases LIKE ? OR f.aliases_ua LIKE ?
     ORDER BY f.is_seed DESC, f.name ASC LIMIT 20`,
    [like, like, like, like]
  );
}

export async function foodsByFlag(db: MacroDatabase, flag: keyof Pick<Food, 'high_protein' | 'high_carbs' | 'high_fat' | 'low_kcal' | 'high_kcal'>) {
  return db.getAllAsync<Food>(`SELECT * FROM food WHERE ${flag} = 1 ORDER BY name ASC LIMIT 12`);
}

export async function getTodayLog(db: MacroDatabase, day = localDateKey()) {
  return db.getAllAsync<LogEntry>(
    `SELECT l.*, COALESCE(f.name, d.name) AS name
     FROM log_entry l
     LEFT JOIN food f ON f.id = l.food_id
     LEFT JOIN custom_dish d ON d.id = l.custom_dish_id
     WHERE l.log_date = ?
     ORDER BY l.created_at DESC, l.id DESC`,
    [day]
  );
}

export async function addFoodLog(db: MacroDatabase, food: Food, grams: number, photoUri?: string | null) {
  const macros = macrosForGrams(food, grams);
  await db.runAsync(
    `INSERT INTO log_entry
     (log_date, source_type, food_id, grams, kcal, protein_g, fat_g, carbs_g, photo_uri)
     VALUES (?, 'FOOD', ?, ?, ?, ?, ?, ?, ?)`,
    [localDateKey(), food.id, grams, macros.kcal, macros.protein_g, macros.fat_g, macros.carbs_g, photoUri ?? null]
  );
}

export async function updateFoodLogGrams(db: MacroDatabase, entry: LogEntry, grams: number) {
  if (!entry.food_id) return;
  const food = await db.getFirstAsync<Food>('SELECT * FROM food WHERE id = ?', [entry.food_id]);
  if (!food) return;
  const macros = macrosForGrams(food, grams);
  await db.runAsync(
    'UPDATE log_entry SET grams = ?, kcal = ?, protein_g = ?, fat_g = ?, carbs_g = ? WHERE id = ?',
    [grams, macros.kcal, macros.protein_g, macros.fat_g, macros.carbs_g, entry.id]
  );
}

export async function removeLogEntry(db: MacroDatabase, id: number) {
  await db.runAsync('DELETE FROM log_entry WHERE id = ?', [id]);
}

export async function getCustomDishes(db: MacroDatabase) {
  return db.getAllAsync<CustomDish>(
    `SELECT d.id, d.name, d.photo_uri, d.servings, d.notes,
            m.total_kcal, m.total_protein_g, m.total_carbs_g, m.total_fat_g
     FROM custom_dish d
     JOIN custom_dish_macros m ON m.dish_id = d.id
     ORDER BY d.updated_at DESC, d.id DESC`
  );
}

export async function addDishLog(db: MacroDatabase, dish: CustomDish, servingsUsed: number) {
  const scale = servingsUsed / dish.servings;
  const macros: MacroTotals = {
    kcal: dish.total_kcal * scale,
    protein_g: dish.total_protein_g * scale,
    carbs_g: dish.total_carbs_g * scale,
    fat_g: dish.total_fat_g * scale
  };
  await db.runAsync(
    `INSERT INTO log_entry
     (log_date, source_type, custom_dish_id, servings_used, kcal, protein_g, fat_g, carbs_g, photo_uri)
     VALUES (?, 'DISH', ?, ?, ?, ?, ?, ?, ?)`,
    [localDateKey(), dish.id, servingsUsed, macros.kcal, macros.protein_g, macros.fat_g, macros.carbs_g, dish.photo_uri]
  );
}

export async function createQuickDish(db: MacroDatabase, name: string, servings: number, ingredientRows: { food: Food; grams: number }[], photoUri?: string | null) {
  const result = await db.runAsync(
    'INSERT INTO custom_dish (name, servings, photo_uri) VALUES (?, ?, ?)',
    [name, servings, photoUri ?? null]
  );
  const dishId = result.lastInsertRowId;
  for (const [position, row] of ingredientRows.entries()) {
    await db.runAsync(
      'INSERT INTO custom_dish_ingredient (dish_id, food_id, grams, position) VALUES (?, ?, ?, ?)',
      [dishId, row.food.id, row.grams, position]
    );
  }
}

export async function getMacroHistory(db: MacroDatabase) {
  return db.getAllAsync<MacroTotals & { log_date: string }>(
    `SELECT log_date,
            SUM(kcal) AS kcal,
            SUM(protein_g) AS protein_g,
            SUM(carbs_g) AS carbs_g,
            SUM(fat_g) AS fat_g
     FROM log_entry
     GROUP BY log_date
     ORDER BY log_date ASC`
  );
}

export function totalsFromLog(log: MacroTotals[]) {
  return addMacros(log);
}
