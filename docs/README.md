# MacroTrack

Cross-platform Expo app for local-first macro, dish, and body composition tracking.

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
