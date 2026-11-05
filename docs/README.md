# MacroTrack

Cross-platform Expo app for local-first macro, dish, and body composition tracking — a private, offline take on MyFitnessPal's core. Logs foods by grams or serving units, scans barcodes against a bundled food database, speeds up logging with recent/frequent foods and saved meals, derives daily macro targets from your goals, and keeps you on track with streaks, local reminders, and a weekly digest. No account, no ads, no cloud.

## Run

```sh
pnpm install
pnpm start
```

Then open in Expo Go or run a native build:

```sh
pnpm android
pnpm ios
```

## Verify

```sh
pnpm test
pnpm typecheck
```

## Distribution

`eas.json` includes an Android internal APK profile and an iOS TestFlight-targeted profile:

```sh
eas build --platform android --profile internal
eas build --platform ios --profile testflight
eas submit --platform ios --profile testflight
```
