# MacroTrack — Product Requirements Document

> Status: Draft v1 · Last updated: 2026-06-02 · Owner: Nik-Kras

---

## Product description

MacroTrack is a cross-platform (iOS + Android) mobile app for tracking **daily nutrition (macros)** and **body composition** over time. It is fully **local-first** — all data lives on the device, no account or internet connection is required. The app pairs precise macro logging with body-measurement tracking and goal progress, wrapped in a fast, low-friction UI.

---

## Main functionality

- **Body composition tracking** — dated records of weight (kg) and measurements (cm): bicep, chest, waist, legs (both), single leg. Each metric has history, charts, and trend dynamics.
- **Nutrition / macro logging** — log foods by name with autocomplete from a pre-seeded database; enter grams and the app computes protein, carbs, fat, and kcal, then totals the day.
- **Dishes (own page/tab)** — a **visual gallery of the user's custom dishes**. Each dish records the grams of every ingredient and a **photo of the finished dish**, and shows its macros (kcal/protein/carbs/fat) **per person and total**. Browse the gallery when unsure what to eat; tap a dish, adjust the grams actually used, hit **Use**, and the whole dish is added to today's log.
- **Local photos** — dishes carry a photo, and when food is logged the photo is attached to the log entry too. All images are **stored locally on the device and never shared**.
- **Curated food categories** — the database is browsable by helpful categories to guide what to eat: good sources of protein / carbs / fat (per WHO guidance), plus low-calorie and high-calorie options. Lets a user pick the right foods for their situation (e.g. "high protein, low calorie" while cutting; "high calorie + protein" while bulking).
- **Daily target bars** — the Nutrition page shows progress bars for kcal, protein, carbs, and fat (current vs. allowed), derived from the user's current weight and goal. Tapping a bar opens the statistics page.
- **Statistics & charts** — deficit/surplus and macro trends across day / week / month time spans.
- **Goals & progress** — onboarding captures current and desired weight/measurements; profile shows a progress bar per metric.
- **Export** — generate shareable text or CSV of a day (with per-food detail) or a week/month summary (macro totals only, no food detail).

---

## Targeted audience

Fitness-minded individuals (cutting, bulking, body recomposition) who want precise control over macros and body measurements. Primary users are the developer and friends — a personal, friends-and-family project, not a commercial product. No monetization.

---

## Core data model (local)

- **General food database** — pre-seeded from a maintained Excel/spreadsheet source (name + macros per 100 g). Read-only baseline shipped with the app.
- **User food/dish database** — custom dishes and foods the user creates; stored **only on the local device**, never shared. Surfaced in the user's own search alongside the general database. A **dish** = a named set of `{ingredient, grams}` entries + a serving/person count + a local photo; macros are computed per person and in total.
- **Local images** — photos for dishes and log entries, stored on-device (file system, paths referenced from the DB). Never uploaded or shared.
- **Body records** — timestamped weight + measurements.
- **Nutrition log** — per-day list of logged foods/dishes with grams, computed macros, and an optional attached photo.
- **User profile & goals** — name, current stats, desired stats, activity level, goal type.

> The Excel source is the human-editable source of truth for the general database. **Decision:** it is transformed into a prebuilt read-only SQLite asset **at build time** and bundled with the app (the `food` rows below are seeded from it with `is_seed = 1`). Curated-category flags travel from the spreadsheet columns into the `food` table verbatim.

---

## SQLite schema (local)

Concrete on-device schema realizing the data model above. SQLite via Expo (`expo-sqlite`). Track the version with `PRAGMA user_version` and bump it on every migration. Enable `PRAGMA foreign_keys = ON`.

**Default dish vs. custom dish — two different shapes (by design):**
- A **default (seeded) dish** is a *flat macro row* in `food` (`kind = 'DISH'`, `is_seed = 1`) — just per-100 g macros, exactly like a product. It has no ingredient list.
- A **custom dish** is a *composite*: a `custom_dish` row + N `custom_dish_ingredient` rows (each = a `food` product + grams). Its macros are **derived** (Σ of ingredient macros), so changing any ingredient's grams changes the dish totals. Per-person = total ÷ servings.

```sql
-- ============================================================
-- 1. Foods: products + DEFAULT dishes + user-created single foods.
--    Anything with flat per-100 g macros lives here. Seeded from
--    the spreadsheet at build time (is_seed = 1, read-only in UI).
-- ============================================================
CREATE TABLE food (
  id            INTEGER PRIMARY KEY,
  kind          TEXT    NOT NULL CHECK (kind IN ('PRODUCT','DISH')),  -- DISH = default/seeded dish
  is_seed       INTEGER NOT NULL DEFAULT 0,   -- 1 = shipped read-only baseline, 0 = user-created
  category      TEXT,                          -- free-text category label from the source
  name          TEXT    NOT NULL,
  name_ua       TEXT,
  aliases       TEXT,                          -- semicolon-separated (English), as in source
  aliases_ua    TEXT,                          -- semicolon-separated (Ukrainian)
  kcal          REAL    NOT NULL,              -- per 100 g, as shipped in source (see note)
  protein_g     REAL    NOT NULL,              -- per 100 g
  fat_g         REAL    NOT NULL,              -- per 100 g
  carbs_g       REAL    NOT NULL,              -- per 100 g
  -- curated-category flags (per-100 g classification, copied from source) --
  low_kcal      INTEGER NOT NULL DEFAULT 0,
  high_kcal     INTEGER NOT NULL DEFAULT 0,
  low_fat       INTEGER NOT NULL DEFAULT 0,
  high_fat      INTEGER NOT NULL DEFAULT 0,
  low_protein   INTEGER NOT NULL DEFAULT 0,
  high_protein  INTEGER NOT NULL DEFAULT 0,
  low_carbs     INTEGER NOT NULL DEFAULT 0,
  high_carbs    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_food_kind ON food(kind);
CREATE INDEX idx_food_name ON food(name);

-- Full-text index over names + aliases for smart/fuzzy search (AC-FD-2).
CREATE VIRTUAL TABLE food_fts USING fts5(
  name, name_ua, aliases, aliases_ua,
  content = 'food', content_rowid = 'id'
);
-- + standard FTS5 external-content sync triggers (food_ai / food_ad / food_au)
--   to keep food_fts in step on INSERT/DELETE/UPDATE.

-- ============================================================
-- 2. Custom dishes: composite, ingredient-driven, macros DERIVED.
-- ============================================================
CREATE TABLE custom_dish (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  name_ua     TEXT,
  photo_uri   TEXT,                            -- local file path (expo-file-system); never uploaded
  servings    INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 1),  -- persons
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE custom_dish_ingredient (
  id        INTEGER PRIMARY KEY,
  dish_id   INTEGER NOT NULL REFERENCES custom_dish(id) ON DELETE CASCADE,
  food_id   INTEGER NOT NULL REFERENCES food(id),  -- the product/ingredient used
  grams     REAL    NOT NULL CHECK (grams >= 0),
  position  INTEGER NOT NULL DEFAULT 0             -- display order in the dish
);
CREATE INDEX idx_cdi_dish ON custom_dish_ingredient(dish_id);

-- Derived (not stored) dish totals; per-person = total / servings (AC-DI-1).
CREATE VIEW custom_dish_macros AS
SELECT d.id AS dish_id, d.servings,
       SUM(f.kcal      * i.grams / 100.0) AS total_kcal,
       SUM(f.protein_g * i.grams / 100.0) AS total_protein_g,
       SUM(f.fat_g     * i.grams / 100.0) AS total_fat_g,
       SUM(f.carbs_g   * i.grams / 100.0) AS total_carbs_g
FROM custom_dish d
JOIN custom_dish_ingredient i ON i.dish_id = d.id
JOIN food f                   ON f.id = i.food_id
GROUP BY d.id, d.servings;

-- ============================================================
-- 3. Nutrition log: one row per logged food or dish per day.
--    Macros are SNAPSHOTTED at log time so history never shifts
--    if a custom food/dish is edited later.
-- ============================================================
CREATE TABLE log_entry (
  id             INTEGER PRIMARY KEY,
  log_date       TEXT    NOT NULL,             -- 'YYYY-MM-DD' (local day)
  source_type    TEXT    NOT NULL CHECK (source_type IN ('FOOD','DISH')),
  food_id        INTEGER REFERENCES food(id),         -- when source_type = 'FOOD'
  custom_dish_id INTEGER REFERENCES custom_dish(id),  -- when source_type = 'DISH'
  grams          REAL,                          -- grams consumed (FOOD entries)
  servings_used  REAL,                          -- portion consumed in persons (DISH entries)
  kcal           REAL    NOT NULL,              -- snapshot of consumed macros...
  protein_g      REAL    NOT NULL,              -- ...computed at log time
  fat_g          REAL    NOT NULL,
  carbs_g        REAL    NOT NULL,
  photo_uri      TEXT,                          -- optional photo attached to this entry (local only)
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (source_type = 'FOOD' AND food_id IS NOT NULL AND custom_dish_id IS NULL) OR
    (source_type = 'DISH' AND custom_dish_id IS NOT NULL AND food_id IS NULL)
  )
);
CREATE INDEX idx_log_date ON log_entry(log_date);

-- ============================================================
-- 4. Body composition: timestamped weight + measurements (cm).
--    All metrics nullable so a record may set only some sites.
-- ============================================================
CREATE TABLE body_record (
  id            INTEGER PRIMARY KEY,
  recorded_at   TEXT NOT NULL DEFAULT (datetime('now')),  -- timestamp
  weight_kg     REAL,
  bicep_cm      REAL,
  chest_cm      REAL,
  waist_cm      REAL,
  leg_both_cm   REAL,    -- legs (both)  } measurement set per PRD;
  single_leg_cm REAL,    -- single leg   } confirm exact sites
  CHECK (weight_kg IS NOT NULL OR bicep_cm IS NOT NULL OR chest_cm IS NOT NULL
      OR waist_cm IS NOT NULL OR leg_both_cm IS NOT NULL OR single_leg_cm IS NOT NULL)
);
CREATE INDEX idx_body_recorded_at ON body_record(recorded_at);

-- ============================================================
-- 5. Profile & goals: a single row (id = 1). Current weight is
--    read from the latest body_record; coefficients are editable
--    (future in-app config) and default to the pinned values.
-- ============================================================
CREATE TABLE profile (
  id                     INTEGER PRIMARY KEY CHECK (id = 1),
  name                   TEXT,
  sex                    TEXT CHECK (sex IN ('male','female')),
  birth_date             TEXT,        -- 'YYYY-MM-DD'; age is derived
  height_cm              REAL,
  activity_level         TEXT CHECK (activity_level IN
                           ('sedentary','lightly_active','moderately_active','very_active','extra_active')),
  goal_type              TEXT CHECK (goal_type IN ('fat_loss','maintenance','muscle_gain')),
  -- desired targets (drive per-metric goal progress bars, AC-OB-2) --
  desired_weight_kg      REAL,
  desired_bicep_cm       REAL,
  desired_chest_cm       REAL,
  desired_waist_cm       REAL,
  desired_leg_both_cm    REAL,
  desired_single_leg_cm  REAL,
  -- configurable formula coefficients (default to the pinned values) --
  calorie_adjustment_pct REAL,        -- e.g. -0.20 fat loss, 0 maintenance, +0.15 gain
  protein_g_per_kg       REAL,        -- e.g. 2.2 fat loss / 1.8 gain / 1.4 maintenance
  fat_g_per_kg           REAL,        -- e.g. 0.8 (floor/cap applied at compute time)
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Notes**
- **Curated categories (resolves open-Q5)** come straight from the flag columns: *good protein/carb/fat sources* = `high_protein` / `high_carbs` / `high_fat`; *low-/high-calorie* = `low_kcal` / `high_kcal`. The source classifies each metric as low **xor** high.
- **kcal storage vs. computed totals**: `food.kcal` is stored as shipped in the spreadsheet (it can differ slightly from 4·P + 4·C + 9·F). Per *Goals & target formulas*, the app's **computed intake/target totals use the 4/4/9 rule on the macro grams** — `food.kcal` is for per-100 g display only. (Minor source/compute divergence is expected; flagged, not silently reconciled.)
- **Custom dishes are not in `food`**, so they can't be nested as ingredients of other custom dishes (no recursion). Ingredients reference `food` rows (products, or — edge case — default dishes).
- **Bilingual**: English + Ukrainian names and semicolon-split aliases are stored; FTS indexes both languages.

---

## Goals & target formulas

Daily kcal and macro targets are **derived**, not entered manually, from the user's weight, profile, and goal (fat loss / muscle gain / maintenance). Coefficients are literature-backed (see *References*) and **configurable**.

### Step 1 — BMR (Mifflin–St Jeor)

W = weight (kg), H = height (cm), A = age (years):

- **Men:** `BMR = 10·W + 6.25·H − 5·A + 5`
- **Women:** `BMR = 10·W + 6.25·H − 5·A − 161`

### Step 2 — TDEE (BMR × activity multiplier, PAL)

| Level | Description | × |
|---|---|---|
| Sedentary | little/no exercise | 1.2 |
| Lightly active | 1–3 days/wk | 1.375 |
| Moderately active | 3–5 days/wk | 1.55 |
| Very active | 6–7 days/wk | 1.725 |
| Extra active | hard daily training / physical job | 1.9 |

`TDEE = BMR × multiplier`

### Step 3 — Calorie target (deficit / surplus vs. TDEE)

| Goal | Adjustment | Target rate of weight change |
|---|---|---|
| Fat loss | **−10% to −25%** (default −20%) | −0.5% to −1.0% body weight / week |
| Maintenance | **0%** (eat at TDEE) | stable |
| Muscle gain | **+10% to +20%** (default +15%) | +0.25% to +0.5% body weight / week |

`Calorie target = TDEE × (1 + adjustment)`. Enforce a floor: never below BMR (practical minimums ≈ 1200 kcal women / 1500 kcal men). Use a % of TDEE rather than a fixed kcal cut, and recalculate as weight changes.

### Step 4 — Macro norms (per kg body weight, by goal)

| Goal | Protein (g/kg) | Fat (g/kg) | Carbs |
|---|---|---|---|
| **Maintenance** | 1.2–1.6 | 0.8–1.0 | remaining calories |
| **Muscle gain** | 1.6–2.2 | 0.8–1.0 | remaining calories |
| **Fat loss** | 1.8–2.7 | 0.8–1.0 | remaining calories |

Energy per gram: protein 4 kcal, carbs 4 kcal, fat 9 kcal.

- **Protein & fat** are set per kg, then **carbs fill the remaining calories**: `carbs_g = (calorie_target − protein_g·4 − fat_g·9) / 4`.
- **Fat floor:** keep fat ≥ `max(20% of calories, ~0.5 g/kg)`; cap ≤ 35% of calories (AMDR).
- For obese or very lean users, protein may be based on **lean body mass** instead of total weight (see below).

### Statistics

Derive **deficit or surplus** over day / week / month / all-time by comparing logged intake against these targets, alongside protein/carb/fat intake trends.

---

## UI/UX choices

- **Design north star: Bring** — clean product/list cells, effortless editing, minimal taps.
- **Quick edit** — long-press (~1s) an item to adjust grams inline.
- **Smart search** — fuzzy name matching suggests foods/dishes as the user types.
- **Three primary tabs** — Profile/Body (measurements + goals), Nutrition/Macros (logging + daily bars), and Dishes (visual gallery).
- **Dishes page layout** — a photo-forward **gallery grid** of the user's dishes; each card shows the dish photo and key macros. Tapping a dish opens a detail view to adjust grams used and **Use** it (adds to today's log). Includes an action to **create a new dish** (add ingredients with grams + take/pick a photo).
- **Nutrition page layout (top → bottom):**
  1. **Daily bars** — kcal/protein/carbs/fat (current vs. allowed). Tapping a bar opens the statistics page.
  2. **Curated categories** — recommended foods grouped by category (protein/carb/fat sources, low/high calorie) for quick, guided selection.
  3. **Today's log** — the foods/dishes eaten so far.
  4. **Statistics button** — also reachable by tapping the bars.
- **Statistics page** — figures, graphs, and plots of calorie deficit/surplus and protein/carb/fat intake over **day / week / month / all-time**.
- **Charts** — measurement and macro trends over the same time spans.
- Speed and simplicity prioritized over feature density; offline and instant by design.

---

## Tech stack

- **Framework:** React Native via **Expo**.
- **Local database:** SQLite (on-device).
- **Charts:** a React Native charting library (TBD).
- **Images:** camera/library capture (`expo-image-picker`) with files saved to local app storage (`expo-file-system`); DB stores file paths.
- **Language:** TypeScript.
- **State/storage:** local-only; no backend, no auth, no network calls required at runtime.

---

## Deployment & distribution

- **Build pipeline:** Expo **EAS Build** with `"distribution": "internal"`.
- **Android:** EAS produces an `.apk`; share via link/QR for direct install. **Free**, no store, no device registration.
- **iOS:** Requires an **Apple Developer account ($99/year)**. Preferred path is **TestFlight** (friends install via link, up to 10,000 testers; rebuild every ~90 days). Alternative is ad-hoc distribution (register each device UDID, max 100/year).
- App stores (full public listing) are **out of scope** for v1.

---

## Acceptance criteria / test cases

These scenarios **double as the v1 test suite** — each is intended to map onto an automated
test, so the build should be driven against them (TDD-style). Every feature in *Main
functionality* and every step in *Goals & target formulas* has at least one criterion.

Numeric values use these **default coefficients** (default, configurable later — see open
question #2): calorie adjustment fat loss **−20%** / maintenance **0%** / muscle gain **+15%**;
protein **2.2 g/kg** (fat loss), **1.8 g/kg** (muscle gain), **1.4 g/kg** (maintenance); fat
**0.8 g/kg** with floor `= max(20% of kcal, 0.5 g/kg)` and cap `= 35% of kcal`. All kcal are
**computed from macros** at 4/4/9 kcal per g (protein/carbs/fat), not read from the source.
Rounding: display whole grams/kcal; round half up.

> **Canonical profile** (reused below): male, 80 kg, 180 cm, 30 y, moderately active (×1.55),
> goal = fat loss. ⇒ BMR 1780, TDEE 2759, target 2207 kcal, protein 176 g, fat 64 g, carbs 232 g.

### Onboarding, profile & goals — `AC-OB`

- **AC-OB-1** — GIVEN a first launch · WHEN onboarding completes capturing sex, age, height,
  current weight + measurements, desired weight + measurements, activity level, and goal type ·
  THEN a profile is persisted locally AND daily targets are derived from it (see `AC-FM`) with no
  manual target entry.
- **AC-OB-2** — GIVEN current weight 80 kg and desired weight 75 kg · WHEN the profile screen
  renders · THEN a per-metric progress bar shows progress from current toward desired (e.g. after
  logging 78 kg the weight bar reads 40% of the 80→75 span).
- **AC-OB-3** — GIVEN no internet connection and no account · WHEN the app is used end to end ·
  THEN every feature works offline (no login, no network call required at runtime).

### Goal & target formulas — `AC-FM`

- **AC-FM-1 (BMR, male)** — GIVEN male, 80 kg, 180 cm, 30 y · THEN `BMR = 10·80 + 6.25·180 −
  5·30 + 5 = 1780`.
- **AC-FM-2 (BMR, female)** — GIVEN female, 60 kg, 165 cm, 28 y · THEN `BMR = 10·60 + 6.25·165 −
  5·28 − 161 = 1330`.
- **AC-FM-3 (TDEE / activity multipliers)** — GIVEN BMR 1780 · THEN TDEE = 2136 (sedentary
  ×1.2), 2448 (lightly ×1.375), 2759 (moderately ×1.55), 3071 (very ×1.725), 3382 (extra ×1.9).
- **AC-FM-4 (calorie target by goal)** — GIVEN TDEE 2759 · THEN target = 2207 (fat loss −20%),
  2759 (maintenance 0%), 3173 (muscle gain +15%).
- **AC-FM-5 (BMR floor)** — GIVEN female, 60 kg, 165 cm, 45 y, sedentary, fat loss −25%
  (BMR 1245, TDEE 1494, raw target 1121) · WHEN the target is below `max(BMR, 1200)` · THEN it is
  clamped up to 1245 (never below BMR; practical minimum ≈1200 women / 1500 men).
- **AC-FM-6 (macro split — protein & fat set, carbs fill)** — GIVEN the canonical profile
  (target 2207) · THEN protein `= 2.2·80 = 176 g` (704 kcal), fat `= 0.8·80 = 64 g` (576 kcal),
  carbs `= (2207 − 704 − 576)/4 = 232 g`.
- **AC-FM-7 (fat floor clamp)** — GIVEN target 2207 kcal, 80 kg, fat set to 0.5 g/kg (40 g =
  16% of kcal, below the 20% floor) · THEN fat is raised to the floor `= max(2207·0.20/9,
  0.5·80) = max(49, 40) = 49 g`; and fat is never above the cap `35%·2207/9 = 86 g`.
- **AC-FM-8 (recalc on weight change)** — GIVEN the canonical profile · WHEN a new weight of
  78 kg is logged · THEN targets recompute (BMR 1760, TDEE 2728, target 2182, protein 172 g) AND
  the daily bars reflect the new allowances.

### Food database & smart search — `AC-FD`

- **AC-FD-1** — GIVEN the pre-seeded general database · THEN entries are read-only (cannot be
  edited or deleted) and expose name + macros per 100 g.
- **AC-FD-2** — GIVEN the user starts typing a food name · WHEN matches exist in either the
  general or the user database · THEN fuzzy/autocomplete suggestions appear from both sources
  combined.
- **AC-FD-3** — GIVEN a user-created food/dish · THEN it is editable and surfaced in search
  alongside general entries, and is stored only on-device.

### Nutrition / macro logging — `AC-NL`

- **AC-NL-1** — GIVEN chicken breast at 31 g protein / 3.6 g fat / 0 g carbs per 100 g · WHEN
  150 g is logged · THEN the entry records +46.5 g protein, +5.4 g fat, +0 g carbs, +235 kcal
  (`4·46.5 + 9·5.4`) AND today's totals increase by the same.
- **AC-NL-2** — GIVEN a logged entry of 150 g · WHEN its grams are edited to 200 g · THEN the
  entry's macros and today's totals rescale proportionally (protein 62 g, kcal ≈313).
- **AC-NL-3** — GIVEN an item in today's log · WHEN it is long-pressed (~1 s) · THEN an inline
  quick-edit for grams opens and saving updates totals immediately.
- **AC-NL-4** — GIVEN a logged entry · WHEN it is removed · THEN today's totals decrement by
  exactly that entry's macros.

### Dishes — `AC-DI`

- **AC-DI-1** — GIVEN a dish of {rice 200 g, chicken 300 g} for 2 persons · THEN macros are
  computed from each ingredient's per-100 g values and shown **both total and per person**
  (per-person = total / 2).
- **AC-DI-2** — GIVEN the Dishes tab · THEN it renders a photo-forward gallery grid where each
  card shows the dish photo and key macros (kcal/protein/carbs/fat).
- **AC-DI-3** — GIVEN a dish detail view · WHEN the grams actually used are adjusted and **Use**
  is tapped · THEN the rescaled dish is appended to today's log and the daily bars update.
- **AC-DI-4** — GIVEN the create-dish action · WHEN ingredients (with grams), a serving/person
  count, and a photo are provided · THEN a new dish is saved to the local user database.

### Local photos — `AC-PH`

- **AC-PH-1** — GIVEN a photo captured or picked for a dish or log entry · THEN the image file
  is saved to local app storage and only its path is stored in the DB.
- **AC-PH-2** — GIVEN any photo save or app operation · THEN no image is uploaded or shared and
  no network request is made (images never leave the device).

### Curated food categories — `AC-CT`

- **AC-CT-1** — GIVEN the curated categories (protein/carb/fat sources, low-calorie,
  high-calorie) · WHEN a category is opened · THEN it lists foods meeting that category's
  definition (e.g. high-protein shows foods above the protein threshold).
  `TODO(open-Q5)`: membership logic assumed *computed from macro thresholds*; revisit once
  thresholds / tag-column decision is finalized.
- **AC-CT-2** — GIVEN a "high protein, low calorie" need while cutting · WHEN that category is
  browsed · THEN selecting a food routes into the normal logging flow (`AC-NL`).

### Daily target bars — `AC-DB`

- **AC-DB-1** — GIVEN the canonical targets (2207 kcal, 176 P / 232 C / 64 F) and today's log ·
  THEN the Nutrition page shows four bars of current vs. allowed for kcal/protein/carbs/fat.
- **AC-DB-2** — GIVEN 1104 kcal logged against a 2207 target · THEN the kcal bar fills ~50%;
  AND when logged ≥ allowed the bar visibly caps/marks at 100%+ (over-target state).
- **AC-DB-3** — GIVEN any daily bar · WHEN it is tapped · THEN the statistics page opens.

### Statistics & charts — `AC-ST`

- **AC-ST-1** — GIVEN logged intake and derived targets · THEN deficit/surplus `= intake −
  target` is shown for day / week / month / all-time (e.g. 2000 logged vs 2207 → −207 deficit).
- **AC-ST-2** — GIVEN a selected time span · THEN protein/carb/fat intake trend series and
  weight/measurement trends render over that span.
- **AC-ST-3** — GIVEN a span with no data · THEN the charts render an empty state without error.

### Body composition tracking — `AC-BC`

- **AC-BC-1** — GIVEN a body record · WHEN weight (kg) and measurements (bicep, chest, waist,
  both legs, single leg, in cm) are entered · THEN each is stored timestamped.
- **AC-BC-2** — GIVEN multiple records over time · THEN each metric shows history, a chart, and
  trend dynamics over day / week / month / all-time.
- **AC-BC-3** — GIVEN any input · THEN only metric units are accepted (kg / cm; no imperial).

### Export — `AC-EX`

- **AC-EX-1** — GIVEN a single day · WHEN exported (text and CSV) · THEN output includes
  per-food detail (name, grams, per-item macros) plus day totals, and is shareable.
- **AC-EX-2** — GIVEN a week or month · WHEN exported · THEN output contains macro totals only,
  with **no per-food detail**.

---

## Out of scope (v1)

- User accounts, login, multi-device sync.
- Cloud backup (nice-to-have, low priority — may revisit).
- Any social/sharing features beyond text/CSV export.
- Barcode scanning.
- AI photo or natural-language food estimation.
- In-app coaching/feedback or recommendations beyond goal-derived targets.
- Monetization, ads, subscriptions.
- Imperial units (kg/cm only).

---

## Nice-to-have / future

- Optional cloud backup & restore.
- Configurable formula coefficients in-app.
- Additional micronutrients (fiber, sugar, sodium).
- Dark mode / theming.

---

## Open questions / to confirm

1. ~~Exact structure of the source Excel (columns, units — assumed macros per 100 g) and how it's bundled.~~ **Resolved:** single `Products` sheet, all values per 100 g; columns `category` (`PRODUCT`/`DISH`), `product_name`(`_ua`), `aliases`(`_ua`, semicolon-separated), `kcal`, `fat_g`, `protein_g`, `carbs_g`, + 8 curated-flag columns. Transformed into a prebuilt read-only SQLite asset at build time (see *SQLite schema*).
2. Final formula coefficients and the list of selectable activity levels / goal types.
3. Charting library choice.
4. Whether any friends use iOS (determines if the $99/yr Apple account is needed).
5. ~~How curated-category membership is determined — a tag column in the source Excel, computed automatically from macro thresholds, or a mix.~~ **Resolved:** explicit per-metric flag columns in the source (`low_/high_` for kcal/fat/protein/carbs; each metric classified low **xor** high), copied into the `food` table. The WHO-based thresholds used to *populate* those flags in the spreadsheet still need documenting.
