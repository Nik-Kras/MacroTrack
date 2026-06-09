import * as SQLite from "expo-sqlite";
import { seedFoods } from "../data/seedFoods";
import { toLocalDateKey, addDays } from "../domain/dates";
import { macrosForFoodGrams } from "../domain/macros";
import { defaultProfile, goalDefaults } from "../domain/targets";
import type { BodyRecord, CustomDish, Food, LogEntry, MacroTotals, Profile, SavedMeal } from "../domain/types";
import { schemaSql } from "./schema";

type Db = SQLite.SQLiteDatabase;

let databasePromise: Promise<Db> | null = null;
let initializedDatabasePromise: Promise<Db> | null = null;

const openDatabase = async () => {
  databasePromise ??= SQLite.openDatabaseAsync("macrotrack.db");
  return databasePromise;
};

export const getDatabase = async () => {
  initializedDatabasePromise ??= initializeDatabase().catch((error) => {
    initializedDatabasePromise = null;
    throw error;
  });
  return initializedDatabasePromise;
};

const initializeDatabase = async () => {
  const db = await openDatabase();
  await db.execAsync(schemaSql);
  await ensureMigrations(db);
  await seedIfNeeded(db);
  return db;
};

const ensureMigrations = async (db: Db) => {
  const profileColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(profile)");
  if (!profileColumns.some((column) => column.name === "onboarded")) {
    await db.execAsync("ALTER TABLE profile ADD COLUMN onboarded INTEGER NOT NULL DEFAULT 0");
  }
  const existingUse = await db.getFirstAsync<{ log_count: number; body_count: number }>(
    `SELECT
       (SELECT COUNT(*) FROM log_entry) AS log_count,
       (SELECT COUNT(*) FROM body_record) AS body_count`
  );
  if ((existingUse?.log_count ?? 0) > 0 || (existingUse?.body_count ?? 0) > 1) {
    await db.runAsync(
      `UPDATE profile
       SET onboarded = 1
       WHERE id = 1
         AND onboarded = 0
         AND birth_date IS NOT NULL
         AND height_cm IS NOT NULL
         AND desired_weight_kg IS NOT NULL`
    );
  }
};

const seedIfNeeded = async (db: Db) => {
  const count = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM food WHERE is_seed = 1");
  if ((count?.count ?? 0) === 0) {
    await db.withTransactionAsync(async () => {
      for (const food of seedFoods) {
        await db.runAsync(
          `INSERT INTO food
          (id, kind, is_seed, category, name, name_ua, aliases, aliases_ua, barcode, kcal, protein_g, fat_g, carbs_g,
           low_kcal, high_kcal, low_fat, high_fat, low_protein, high_protein, low_carbs, high_carbs)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          food.id,
          food.kind,
          1,
          food.category,
          food.name,
          food.name_ua,
          food.aliases,
          food.aliases_ua,
          food.barcode || null,
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
        );
        for (const serving of food.servings ?? []) {
          await db.runAsync(
            "INSERT INTO food_serving (food_id, label, grams, is_default) VALUES (?, ?, ?, ?)",
            food.id,
            serving.label,
            serving.grams,
            serving.is_default ?? 0
          );
        }
      }
      const profile = defaultProfile();
      await db.runAsync(
        `INSERT OR IGNORE INTO profile
        (id, name, onboarded, sex, birth_date, height_cm, activity_level, goal_type, desired_weight_kg,
         desired_bicep_cm, desired_chest_cm, desired_waist_cm, desired_leg_both_cm, desired_single_leg_cm,
         calorie_adjustment_pct, protein_g_per_kg, fat_g_per_kg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        profile.id,
        profile.name,
        profile.onboarded,
        profile.sex,
        profile.birth_date,
        profile.height_cm,
        profile.activity_level,
        profile.goal_type,
        profile.desired_weight_kg,
        profile.desired_bicep_cm,
        profile.desired_chest_cm,
        profile.desired_waist_cm,
        profile.desired_leg_both_cm,
        profile.desired_single_leg_cm,
        profile.calorie_adjustment_pct,
        profile.protein_g_per_kg,
        profile.fat_g_per_kg
      );
      await db.runAsync("INSERT INTO reminder (label, time_of_day, enabled) VALUES (?, ?, ?)", "Log lunch", "12:00", 0);
    });
  }
  const profile = await db.getFirstAsync<{ id: number }>("SELECT id FROM profile WHERE id = 1");
  if (!profile) {
    const defaults = defaultProfile();
    await db.runAsync(
      `INSERT INTO profile
      (id, name, onboarded, sex, birth_date, height_cm, activity_level, goal_type, desired_weight_kg,
       desired_bicep_cm, desired_chest_cm, desired_waist_cm, desired_leg_both_cm, desired_single_leg_cm,
       calorie_adjustment_pct, protein_g_per_kg, fat_g_per_kg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      defaults.id,
      defaults.name,
      defaults.onboarded,
      defaults.sex,
      defaults.birth_date,
      defaults.height_cm,
      defaults.activity_level,
      defaults.goal_type,
      defaults.desired_weight_kg,
      defaults.desired_bicep_cm,
      defaults.desired_chest_cm,
      defaults.desired_waist_cm,
      defaults.desired_leg_both_cm,
      defaults.desired_single_leg_cm,
      defaults.calorie_adjustment_pct,
      defaults.protein_g_per_kg,
      defaults.fat_g_per_kg
    );
  }
};

export const searchFoods = async (query: string, filter?: keyof Food) => {
  const db = await getDatabase();
  const trimmed = query.trim();
  const where: string[] = [];
  const params: SQLite.SQLiteBindValue[] = [];
  if (trimmed) {
    const terms = trimmed
      .split(/\s+/)
      .map((term) => term.replace(/[^\p{L}\p{N}_]+/gu, ""))
      .filter(Boolean)
      .map((term) => `${term}*`);
    if (terms.length === 0) return [];
    where.push("food_fts MATCH ?");
    params.push(terms.join(" "));
  }
  if (filter) {
    where.push(`f.${filter} = 1`);
  }
  if (trimmed) {
    return db.getAllAsync<Food>(
      `SELECT f.*
       FROM food f
       JOIN food_fts ON food_fts.rowid = f.id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY bm25(food_fts), f.is_seed DESC, f.name
       LIMIT 60`,
      ...params
    );
  }
  return db.getAllAsync<Food>(
    `SELECT f.* FROM food f ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY f.is_seed DESC, f.name LIMIT 60`,
    ...params
  );
};

export const findFoodByBarcode = async (barcode: string) => {
  const db = await getDatabase();
  return db.getFirstAsync<Food>("SELECT * FROM food WHERE barcode = ? LIMIT 1", barcode);
};

export const createCustomFood = async (
  food: Pick<Food, "name" | "kcal" | "protein_g" | "fat_g" | "carbs_g"> & {
    barcode?: string | null;
    aliases?: string | null;
  }
) => {
  const db = await getDatabase();
  const flags = curatedFlags(food);
  const result = await db.runAsync(
    `INSERT INTO food
    (kind, is_seed, category, name, aliases, barcode, kcal, protein_g, fat_g, carbs_g,
     low_kcal, high_kcal, low_fat, high_fat, low_protein, high_protein, low_carbs, high_carbs)
    VALUES ('PRODUCT', 0, 'PRODUCT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    food.name,
    food.aliases ?? null,
    food.barcode ?? null,
    food.kcal,
    food.protein_g,
    food.fat_g,
    food.carbs_g,
    flags.low_kcal,
    flags.high_kcal,
    flags.low_fat,
    flags.high_fat,
    flags.low_protein,
    flags.high_protein,
    flags.low_carbs,
    flags.high_carbs
  );
  return db.getFirstAsync<Food>("SELECT * FROM food WHERE id = ?", result.lastInsertRowId);
};

export const getProfile = async () => {
  const db = await getDatabase();
  return db.getFirstAsync<Profile>("SELECT * FROM profile WHERE id = 1");
};

export const saveOnboardingProfile = async (
  profile: Pick<
    Profile,
    | "name"
    | "sex"
    | "birth_date"
    | "height_cm"
    | "activity_level"
    | "goal_type"
    | "desired_weight_kg"
    | "desired_bicep_cm"
    | "desired_chest_cm"
    | "desired_waist_cm"
    | "desired_leg_both_cm"
    | "desired_single_leg_cm"
  >,
  body: Pick<BodyRecord, "weight_kg" | "bicep_cm" | "chest_cm" | "waist_cm" | "leg_both_cm" | "single_leg_cm">
) => {
  const db = await getDatabase();
  const goal = goalDefaults[profile.goal_type];
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM body_record
       WHERE id IN (
         SELECT id FROM body_record
         WHERE (SELECT COUNT(*) FROM body_record) = 1
           AND weight_kg = 80
           AND waist_cm = 90
           AND bicep_cm IS NULL
           AND chest_cm IS NULL
           AND leg_both_cm IS NULL
           AND single_leg_cm IS NULL
           AND photo_uri IS NULL
       )`
    );
    await db.runAsync(
      `UPDATE profile
       SET name = ?,
           onboarded = 1,
           sex = ?,
           birth_date = ?,
           height_cm = ?,
           activity_level = ?,
           goal_type = ?,
           desired_weight_kg = ?,
           desired_bicep_cm = ?,
           desired_chest_cm = ?,
           desired_waist_cm = ?,
           desired_leg_both_cm = ?,
           desired_single_leg_cm = ?,
           calorie_adjustment_pct = ?,
           protein_g_per_kg = ?,
           fat_g_per_kg = ?,
           updated_at = datetime('now')
       WHERE id = 1`,
      profile.name?.trim() || "MacroTrack",
      profile.sex,
      profile.birth_date,
      profile.height_cm,
      profile.activity_level,
      profile.goal_type,
      profile.desired_weight_kg,
      profile.desired_bicep_cm,
      profile.desired_chest_cm,
      profile.desired_waist_cm,
      profile.desired_leg_both_cm,
      profile.desired_single_leg_cm,
      goal.calorieAdjustmentPct,
      goal.proteinGPerKg,
      goal.fatGPerKg
    );
    await db.runAsync(
      `INSERT INTO body_record
       (weight_kg, bicep_cm, chest_cm, waist_cm, leg_both_cm, single_leg_cm)
       VALUES (?, ?, ?, ?, ?, ?)`,
      body.weight_kg,
      body.bicep_cm,
      body.chest_cm,
      body.waist_cm,
      body.leg_both_cm,
      body.single_leg_cm
    );
  });
};

export const getBodyRecords = async () => {
  const db = await getDatabase();
  return db.getAllAsync<BodyRecord>("SELECT * FROM body_record ORDER BY recorded_at ASC");
};

export const saveBodyRecord = async (record: Partial<BodyRecord>) => {
  const hasMetric = [
    record.weight_kg,
    record.bicep_cm,
    record.chest_cm,
    record.waist_cm,
    record.leg_both_cm,
    record.single_leg_cm,
    record.photo_uri
  ].some((value) => value !== null && value !== undefined && value !== "");
  if (!hasMetric) return false;
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO body_record
    (weight_kg, bicep_cm, chest_cm, waist_cm, leg_both_cm, single_leg_cm, photo_uri)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    record.weight_kg ?? null,
    record.bicep_cm ?? null,
    record.chest_cm ?? null,
    record.waist_cm ?? null,
    record.leg_both_cm ?? null,
    record.single_leg_cm ?? null,
    record.photo_uri ?? null
  );
  return true;
};

export const getLogEntries = async (dateKey = toLocalDateKey()) => {
  const db = await getDatabase();
  return db.getAllAsync<LogEntry>(
    `SELECT le.*, COALESCE(f.name, cd.name) AS name
     FROM log_entry le
     LEFT JOIN food f ON f.id = le.food_id
     LEFT JOIN custom_dish cd ON cd.id = le.custom_dish_id
     WHERE le.log_date = ?
     ORDER BY le.created_at DESC, le.id DESC`,
    dateKey
  );
};

export const getLoggedDates = async () => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ log_date: string }>("SELECT DISTINCT log_date FROM log_entry ORDER BY log_date DESC");
  return rows.map((row) => row.log_date);
};

export const addFoodLog = async (food: Food, grams: number, dateKey = toLocalDateKey()) => {
  const db = await getDatabase();
  const macros = macrosForFoodGrams(food, grams);
  await db.runAsync(
    `INSERT INTO log_entry
    (log_date, source_type, food_id, grams, kcal, protein_g, fat_g, carbs_g)
    VALUES (?, 'FOOD', ?, ?, ?, ?, ?, ?)`,
    dateKey,
    food.id,
    grams,
    macros.kcal,
    macros.protein_g,
    macros.fat_g,
    macros.carbs_g
  );
  await unlockBadges(db);
};

export const updateFoodLogGrams = async (entry: LogEntry, grams: number) => {
  if (!entry.food_id) return;
  const db = await getDatabase();
  const food = await db.getFirstAsync<Food>("SELECT * FROM food WHERE id = ?", entry.food_id);
  if (!food) return;
  const macros = macrosForFoodGrams(food, grams);
  await db.runAsync(
    "UPDATE log_entry SET grams = ?, kcal = ?, protein_g = ?, fat_g = ?, carbs_g = ? WHERE id = ?",
    grams,
    macros.kcal,
    macros.protein_g,
    macros.fat_g,
    macros.carbs_g,
    entry.id
  );
};

export const deleteLogEntry = async (id: number) => {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM log_entry WHERE id = ?", id);
};

export const copyPreviousDay = async (dateKey = toLocalDateKey()) => {
  const db = await getDatabase();
  const previous = addDays(dateKey, -1);
  const rows = await db.getAllAsync<LogEntry>("SELECT *, '' as name FROM log_entry WHERE log_date = ?", previous);
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        `INSERT INTO log_entry
        (log_date, source_type, food_id, custom_dish_id, grams, serving_id, quantity, servings_used, kcal, protein_g, fat_g, carbs_g, photo_uri)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        dateKey,
        row.source_type,
        row.food_id,
        row.custom_dish_id,
        row.grams,
        row.serving_id,
        row.quantity,
        row.servings_used,
        row.kcal,
        row.protein_g,
        row.fat_g,
        row.carbs_g,
        row.photo_uri
      );
    }
  });
};

export const getRecentFoods = async () => {
  const db = await getDatabase();
  return db.getAllAsync<Food>(
    `SELECT f.* FROM food f
     JOIN (SELECT food_id, MAX(created_at) last_at FROM log_entry WHERE food_id IS NOT NULL GROUP BY food_id) r ON r.food_id = f.id
     ORDER BY r.last_at DESC LIMIT 20`
  );
};

export const getFrequentFoods = async () => {
  const db = await getDatabase();
  return db.getAllAsync<Food>(
    `SELECT f.* FROM food f
     JOIN (SELECT food_id, COUNT(*) count FROM log_entry WHERE food_id IS NOT NULL GROUP BY food_id) r ON r.food_id = f.id
     ORDER BY r.count DESC, f.name LIMIT 20`
  );
};

export const createCustomDish = async (name: string, servings: number, ingredients: Array<{ food: Food; grams: number }>, photoUri?: string) => {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      "INSERT INTO custom_dish (name, servings, photo_uri) VALUES (?, ?, ?)",
      name,
      Math.max(1, servings),
      photoUri ?? null
    );
    const dishId = result.lastInsertRowId;
    for (const [index, ingredient] of ingredients.entries()) {
      await db.runAsync(
        "INSERT INTO custom_dish_ingredient (dish_id, food_id, grams, position) VALUES (?, ?, ?, ?)",
        dishId,
        ingredient.food.id,
        ingredient.grams,
        index
      );
    }
  });
};

export const getCustomDishes = async () => {
  const db = await getDatabase();
  return db.getAllAsync<CustomDish>(
    `SELECT d.*,
            (m.total_protein_g * 4.0 + m.total_fat_g * 9.0 + m.total_carbs_g * 4.0) AS total_kcal,
            m.total_protein_g,
            m.total_fat_g,
            m.total_carbs_g
     FROM custom_dish d
     JOIN custom_dish_macros m ON m.dish_id = d.id
     ORDER BY d.updated_at DESC`
  );
};

export const logDish = async (dish: CustomDish, servingsUsed: number, dateKey = toLocalDateKey()) => {
  const db = await getDatabase();
  const scale = servingsUsed / dish.servings;
  const protein_g = dish.total_protein_g * scale;
  const fat_g = dish.total_fat_g * scale;
  const carbs_g = dish.total_carbs_g * scale;
  await db.runAsync(
    `INSERT INTO log_entry
    (log_date, source_type, custom_dish_id, servings_used, kcal, protein_g, fat_g, carbs_g, photo_uri)
    VALUES (?, 'DISH', ?, ?, ?, ?, ?, ?, ?)`,
    dateKey,
    dish.id,
    servingsUsed,
    protein_g * 4 + fat_g * 9 + carbs_g * 4,
    protein_g,
    fat_g,
    carbs_g,
    dish.photo_uri
  );
};

export const getSavedMeals = async () => {
  const db = await getDatabase();
  return db.getAllAsync<SavedMeal>(
    `SELECT sm.id,
            sm.name,
            sm.created_at,
            COUNT(smi.id) AS item_count,
            COALESCE(SUM(CASE
              WHEN smi.source_type = 'FOOD' THEN f.protein_g * smi.grams / 100.0 * 4.0 + f.fat_g * smi.grams / 100.0 * 9.0 + f.carbs_g * smi.grams / 100.0 * 4.0
              ELSE dm.total_protein_g * smi.servings_used / dm.servings * 4.0 + dm.total_fat_g * smi.servings_used / dm.servings * 9.0 + dm.total_carbs_g * smi.servings_used / dm.servings * 4.0
            END), 0) AS total_kcal,
            COALESCE(SUM(CASE WHEN smi.source_type = 'FOOD' THEN f.protein_g * smi.grams / 100.0 ELSE dm.total_protein_g * smi.servings_used / dm.servings END), 0) AS total_protein_g,
            COALESCE(SUM(CASE WHEN smi.source_type = 'FOOD' THEN f.fat_g * smi.grams / 100.0 ELSE dm.total_fat_g * smi.servings_used / dm.servings END), 0) AS total_fat_g,
            COALESCE(SUM(CASE WHEN smi.source_type = 'FOOD' THEN f.carbs_g * smi.grams / 100.0 ELSE dm.total_carbs_g * smi.servings_used / dm.servings END), 0) AS total_carbs_g
     FROM saved_meal sm
     LEFT JOIN saved_meal_item smi ON smi.saved_meal_id = sm.id
     LEFT JOIN food f ON f.id = smi.food_id
     LEFT JOIN custom_dish_macros dm ON dm.dish_id = smi.custom_dish_id
     GROUP BY sm.id
     ORDER BY sm.created_at DESC`
  );
};

export const logSavedMeal = async (mealId: number, dateKey = toLocalDateKey()) => {
  const db = await getDatabase();
  const items = await db.getAllAsync<{
    source_type: "FOOD" | "DISH";
    food_id: number | null;
    custom_dish_id: number | null;
    grams: number | null;
    serving_id: number | null;
    quantity: number | null;
    servings_used: number | null;
    food_kcal: number | null;
    food_protein_g: number | null;
    food_fat_g: number | null;
    food_carbs_g: number | null;
    dish_servings: number | null;
    total_protein_g: number | null;
    total_fat_g: number | null;
    total_carbs_g: number | null;
    photo_uri: string | null;
  }>(
    `SELECT smi.*,
            f.kcal AS food_kcal,
            f.protein_g AS food_protein_g,
            f.fat_g AS food_fat_g,
            f.carbs_g AS food_carbs_g,
            cd.photo_uri,
            dm.servings AS dish_servings,
            dm.total_protein_g,
            dm.total_fat_g,
            dm.total_carbs_g
     FROM saved_meal_item smi
     LEFT JOIN food f ON f.id = smi.food_id
     LEFT JOIN custom_dish cd ON cd.id = smi.custom_dish_id
     LEFT JOIN custom_dish_macros dm ON dm.dish_id = smi.custom_dish_id
     WHERE smi.saved_meal_id = ?
     ORDER BY smi.position, smi.id`,
    mealId
  );

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      if (item.source_type === "FOOD" && item.food_id && item.grams !== null) {
        const protein_g = ((item.food_protein_g ?? 0) * item.grams) / 100;
        const fat_g = ((item.food_fat_g ?? 0) * item.grams) / 100;
        const carbs_g = ((item.food_carbs_g ?? 0) * item.grams) / 100;
        await db.runAsync(
          `INSERT INTO log_entry
          (log_date, source_type, food_id, grams, serving_id, quantity, kcal, protein_g, fat_g, carbs_g)
          VALUES (?, 'FOOD', ?, ?, ?, ?, ?, ?, ?, ?)`,
          dateKey,
          item.food_id,
          item.grams,
          item.serving_id,
          item.quantity,
          protein_g * 4 + fat_g * 9 + carbs_g * 4,
          protein_g,
          fat_g,
          carbs_g
        );
      } else if (item.source_type === "DISH" && item.custom_dish_id) {
        const scale = (item.servings_used ?? 1) / (item.dish_servings ?? 1);
        const protein_g = (item.total_protein_g ?? 0) * scale;
        const fat_g = (item.total_fat_g ?? 0) * scale;
        const carbs_g = (item.total_carbs_g ?? 0) * scale;
        await db.runAsync(
          `INSERT INTO log_entry
          (log_date, source_type, custom_dish_id, servings_used, kcal, protein_g, fat_g, carbs_g, photo_uri)
          VALUES (?, 'DISH', ?, ?, ?, ?, ?, ?, ?)`,
          dateKey,
          item.custom_dish_id,
          item.servings_used ?? 1,
          protein_g * 4 + fat_g * 9 + carbs_g * 4,
          protein_g,
          fat_g,
          carbs_g,
          item.photo_uri
        );
      }
    }
  });
};

export const createSavedMealFromToday = async (name: string, dateKey = toLocalDateKey()) => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<LogEntry>("SELECT *, '' as name FROM log_entry WHERE log_date = ?", dateKey);
  if (rows.length === 0) return false;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync("INSERT INTO saved_meal (name) VALUES (?)", name);
    for (const [index, row] of rows.entries()) {
      await db.runAsync(
        `INSERT INTO saved_meal_item
        (saved_meal_id, source_type, food_id, custom_dish_id, grams, serving_id, quantity, servings_used, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        result.lastInsertRowId,
        row.source_type,
        row.food_id,
        row.custom_dish_id,
        row.grams,
        row.serving_id,
        row.quantity,
        row.servings_used,
        index
      );
    }
  });
  return true;
};

export const dailySummaryCsv = (entries: LogEntry[]) => {
  const header = "name,grams,kcal,protein_g,fat_g,carbs_g";
  const lines = entries.map((entry) =>
    [entry.name, entry.grams ?? "", entry.kcal, entry.protein_g, entry.fat_g, entry.carbs_g]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );
  return [header, ...lines].join("\n");
};

const unlockBadges = async (db: Db) => {
  const dates = await db.getAllAsync<{ log_date: string }>("SELECT DISTINCT log_date FROM log_entry");
  if (dates.length > 0) {
    await db.runAsync("INSERT OR IGNORE INTO achievement (code) VALUES ('FIRST_LOG')");
  }
  if (dates.length >= 7) {
    await db.runAsync("INSERT OR IGNORE INTO achievement (code) VALUES ('STREAK_7')");
  }
};

const curatedFlags = (food: Pick<Food, "kcal" | "protein_g" | "fat_g" | "carbs_g">) => ({
  low_kcal: food.kcal < 100 ? 1 : 0,
  high_kcal: food.kcal >= 250 ? 1 : 0,
  low_fat: food.fat_g < 3 ? 1 : 0,
  high_fat: food.fat_g >= 15 ? 1 : 0,
  low_protein: food.protein_g < 5 ? 1 : 0,
  high_protein: food.protein_g >= 10 ? 1 : 0,
  low_carbs: food.carbs_g < 10 ? 1 : 0,
  high_carbs: food.carbs_g >= 25 ? 1 : 0
});

export const getSpanTotals = async (fromDate: string, toDate: string) => {
  const db = await getDatabase();
  return db.getAllAsync<MacroTotals & { log_date: string }>(
    `SELECT log_date, SUM(kcal) kcal, SUM(protein_g) protein_g, SUM(fat_g) fat_g, SUM(carbs_g) carbs_g
     FROM log_entry
     WHERE log_date BETWEEN ? AND ?
     GROUP BY log_date
     ORDER BY log_date`,
    fromDate,
    toDate
  );
};
