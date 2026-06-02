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

> The Excel source is the human-editable source of truth for the general database. How it's consumed (shipped directly vs. transformed into SQLite at build time) is an implementation decision to be made later.

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

1. Exact structure of the source Excel (columns, units — assumed macros per 100 g) and how it's bundled.
2. Final formula coefficients and the list of selectable activity levels / goal types.
3. Charting library choice.
4. Whether any friends use iOS (determines if the $99/yr Apple account is needed).
5. How curated-category membership is determined — a tag column in the source Excel, computed automatically from macro thresholds (e.g. kcal/100g, % protein), or a mix. WHO-based thresholds to be defined.
