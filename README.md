# MacroTrack

Local-first macro & body-composition tracker for iOS + Android, built with **Expo + React Native + TypeScript**. This is a from-scratch implementation of the **MacroTrack** design prototype (see [`design/`](./design)).

No accounts, no servers — all data lives on the device.

## Features (from the prototype)

- **Nutrition** — daily calorie ring + protein/carbs/fat target bars, curated WHO-style food categories, today's log with long-press-to-edit, and a date navigator with a deficit/surplus **calendar heatmap**.
- **Add food** — searchable seeded food database, per-100 g macros, **raw ↔ cooked** gram conversion (yield factors), quick gram presets, and live macro preview. Create **custom foods** with emoji/photo, categories, and auto/manual calories.
- **Dishes** — photo gallery of composite dishes (`{ingredient, grams}` × servings). Open a dish, scale servings, and **Use** it to add the whole thing to the log. Build/edit dishes with a per-serving macro summary.
- **Profile** — Mifflin–St Jeor → TDEE → goal-adjusted daily targets, editable profile/goal with live target preview, and body metrics (weight + measurements) with sparklines and goal-progress bars. Log new measurements.
- **Statistics** — energy balance bars, average macros vs target, and a weight-trend chart across day / week / month / all spans.

## Install on Android

<img src="docs/install-qr.png" width="180" alt="QR code: download MacroTrack.apk">

Scan with the phone camera (or open
[MacroTrack.apk](https://github.com/Nik-Kras/MacroTrack/releases/latest/download/MacroTrack.apk) on the phone),
open the downloaded file and tap **Install**. Later versions: the app shows **Update available · Update** on the
Nutrition screen; Update downloads the new APK the same way and installs it over the old one, keeping your data.

**Moving from Expo Go** (one time — Expo Go keeps its data inside Expo Go): in Expo Go open Profile → **Export
backup** and save the file (e.g. to Downloads or Drive); install the APK; in the installed app open Profile →
**Import backup** and pick that file.

## Photo logging (on-device AI)

In **Add food**, the camera (or gallery) button photographs a meal; a model **on the phone** — Gemma 3n E2B through
Google's LiteRT-LM, the same as in [MamaKcal](https://github.com/Nik-Kras/MamaKcal), which benchmarked it — lists the
foods with their grams. A review sheet shows each one matched onto **your food list, seed and custom foods**:
swap, remove or add foods, fix the grams (as served: cooked weight for foods that cook), then **Log meal** logs
them together as one meal. Custom foods named in Ukrainian are found through MamaKcal's Ukrainian↔English food
list (`src/data/bridge.json`); a correction made twice is learned. Nothing leaves the phone.

The model (3.7 GB) isn't in the APK: the first photo offers **Download** (Wi‑Fi only; Android shows the progress and
it carries on with the app closed). It comes from MamaKcal's model release (unmodified Google file in two parts).
Gemma is provided under and subject to the Gemma Terms of Use found at [ai.google.dev/gemma/terms](https://ai.google.dev/gemma/terms).
It needs the installed APK — it can't run in Expo Go.

Code: `modules/litert-lm/` (native module + model download), `src/lib/ai/` (prompt, matching, learning — tested),
`src/overlays/PhotoSheet.tsx` (review sheet).

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

## Release (Android)

Release builds are signed with `~/.android/macrotrack-release.jks` (passwords in `~/.gradle/gradle.properties`,
`MACROTRACK_*`; `plugins/withReleaseSigning.js`). **Back up both** — without them no update can install over the
installed app. Bump `version` and `android.versionCode` in `app.json`, then:

```bash
pnpm test && pnpm typecheck
pnpm release:android        # → android/app/build/outputs/apk/release/app-release.apk (arm64)
cp android/app/build/outputs/apk/release/app-release.apk /tmp/MacroTrack.apk
GH_TOKEN=$(gh auth token --user Nik-Kras) gh release create vX.Y.Z /tmp/MacroTrack.apk --repo Nik-Kras/MacroTrack --latest
```

The asset must be named `MacroTrack.apk`: the README QR (`pnpm qr` redraws it) and the in-app update check both use
the latest release.

