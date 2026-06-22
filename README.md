# MacroTrack

Local-first macro & body-composition tracker for iOS + Android, built with **Expo + React Native + TypeScript**. This is a from-scratch implementation of the **MacroTrack** design prototype (see [`design/`](./design)).

No accounts, no servers — all data lives on the device.

## Features (from the prototype)

- **Nutrition** — daily calorie ring + protein/carbs/fat target bars, curated WHO-style food categories, today's log with long-press-to-edit, and a date navigator with a deficit/surplus **calendar heatmap**.
- **Add food** — searchable seeded food database, per-100 g macros, **raw ↔ cooked** gram conversion (yield factors), quick gram presets, and live macro preview. Create **custom foods** with emoji/photo, categories, and auto/manual calories.
- **Dishes** — photo gallery of composite dishes (`{ingredient, grams}` × servings). Open a dish, scale servings, and **Use** it to add the whole thing to the log. Build/edit dishes with a per-serving macro summary.
- **Profile** — Mifflin–St Jeor → TDEE → goal-adjusted daily targets, editable profile/goal with live target preview, and body metrics (weight + measurements) with sparklines and goal-progress bars. Log new measurements.
- **Statistics** — energy balance bars, average macros vs target, and a weight-trend chart across day / week / month / all spans.

## Stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript (strict)
- `react-native-svg` for charts (ring, sparkline, net-balance, weight area)
- **`expo-sqlite`** for durable local persistence — a WAL-mode SQLite database
  with atomic writes, a rotating backup row, corruption recovery, and one-time
  migration from the legacy AsyncStorage blob. State is flushed on every change
  (debounced) and immediately when the app is backgrounded.
- **`expo-file-system`** stores dish/food photos as files on disk; only their
  `file://` URIs are kept in the database, so the persisted blob stays tiny and
  never hits storage limits (no base64 bloat = no silent data loss).
- Manrope + Space Grotesk via `@expo-google-fonts`
- `expo-image-picker` for picking local dish/food photos

State is a single store (`src/store/store.tsx`) mirroring the prototype's state machine — a custom tab bar and animated bottom-sheet overlays, no navigation library.

## Run

```bash
pnpm install
pnpm start          # then press i (iOS) / a (Android), or scan the QR with Expo Go
```

Other scripts: `pnpm ios`, `pnpm android`, `pnpm web`, `pnpm typecheck`.

## Project layout

```
src/
  theme.ts            design tokens (colors, fonts)
  types.ts            domain types
  data/seed.ts        seeded foods, dishes, body records, metadata
  lib/                nutrition math, dates, photo picker
  store/store.tsx     app state (hydrate + debounced/background save)
  store/persistence.ts durable SQLite store: load/save, backup, recovery, migration
  components/         charts, bottom sheet, icons, UI primitives
  screens/            Nutrition · Dishes · Profile · Statistics
  overlays/           Calendar · AddFood · Grams · Dish · Onboarding · Measure · FoodEditor · DishBuilder
  Root.tsx            screen router + tab bar + FAB + overlays
```

The original design lives in [`design/`](./design) (`MacroTrack.dc.html`, `MacroTrack Showcase.dc.html`). Product scope is documented in [`docs/PRD.md`](./docs/PRD.md).
