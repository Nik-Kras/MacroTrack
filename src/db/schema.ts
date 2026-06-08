export const schemaSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS food (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('PRODUCT','DISH')),
  is_seed INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  name TEXT NOT NULL,
  name_ua TEXT,
  aliases TEXT,
  aliases_ua TEXT,
  barcode TEXT,
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
CREATE INDEX IF NOT EXISTS idx_food_barcode ON food(barcode);

CREATE TABLE IF NOT EXISTS food_serving (
  id INTEGER PRIMARY KEY,
  food_id INTEGER NOT NULL REFERENCES food(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  grams REAL NOT NULL CHECK (grams > 0),
  is_default INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_food_serving_food ON food_serving(food_id);

CREATE VIRTUAL TABLE IF NOT EXISTS food_fts USING fts5(
  name, name_ua, aliases, aliases_ua,
  content = 'food', content_rowid = 'id'
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
  serving_id INTEGER REFERENCES food_serving(id),
  quantity REAL,
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
  photo_uri TEXT,
  CHECK (weight_kg IS NOT NULL OR bicep_cm IS NOT NULL OR chest_cm IS NOT NULL
    OR waist_cm IS NOT NULL OR leg_both_cm IS NOT NULL OR single_leg_cm IS NOT NULL
    OR photo_uri IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_body_recorded_at ON body_record(recorded_at);

CREATE TABLE IF NOT EXISTS saved_meal (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_meal_item (
  id INTEGER PRIMARY KEY,
  saved_meal_id INTEGER NOT NULL REFERENCES saved_meal(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('FOOD','DISH')),
  food_id INTEGER REFERENCES food(id),
  custom_dish_id INTEGER REFERENCES custom_dish(id),
  grams REAL,
  serving_id INTEGER REFERENCES food_serving(id),
  quantity REAL,
  servings_used REAL,
  position INTEGER NOT NULL DEFAULT 0,
  CHECK (
    (source_type = 'FOOD' AND food_id IS NOT NULL AND custom_dish_id IS NULL) OR
    (source_type = 'DISH' AND custom_dish_id IS NOT NULL AND food_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_smi_meal ON saved_meal_item(saved_meal_id);

CREATE TABLE IF NOT EXISTS reminder (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS achievement (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
`;
