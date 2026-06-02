# MacroTrack Emulator Deployment on Mac

This guide explains how an agent or developer should launch MacroTrack in an Android emulator on macOS, and how a user should open and navigate the running app.

## Current App Shape

MacroTrack is an Expo React Native app. The emulator workflow is handled by:

```sh
pnpm emulator
```

That script runs `scripts/dev/emulator-deploy.sh`, which:

- starts or reuses an Android emulator
- waits for Android to finish booting
- starts Expo Metro on port `8082` if it is not already running
- routes the emulator back to Metro with `adb reverse`
- opens the app URL `exp://127.0.0.1:8082` inside the emulator

The app uses local SQLite data and seeds its own local database on first launch.

## Mac Prerequisites

Install these before asking an agent to run the emulator:

- macOS with Homebrew available
- Node.js and `pnpm`
- Android Studio or Android command line tools
- Android SDK platform tools and emulator binaries
- Java, preferably Homebrew OpenJDK
- an Android Virtual Device named `MacroTrack_API_35`, or set `AVD_NAME` to the actual AVD name
- Expo Go installed in the Android emulator, because the deploy script opens an Expo `exp://` URL

The deploy script defaults to these local paths:

```sh
ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools
JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home
EXPO_PORT=8082
AVD_NAME=MacroTrack_API_35
```

If your Android SDK is elsewhere, set `ANDROID_SDK_ROOT` or `ANDROID_HOME` before running the script.

## Agent Instructions

Use these steps when operating as CloudCode, Cursor, Claude Code, Codex, or another coding agent with shell access.

1. Start from the repository root:

```sh
cd /Users/nikitakrasnytskyi/Repos/MacroTrack
```

2. Install dependencies if `node_modules` is missing or stale:

```sh
pnpm install
```

3. Verify the code before launching:

```sh
pnpm typecheck
pnpm test
```

4. Launch the Android emulator and Metro:

```sh
pnpm emulator
```

Keep this command running. Expo Metro is an interactive long-running process; stopping it disconnects the emulator from the app.

5. If the AVD has a different name, run:

```sh
AVD_NAME="Your_AVD_Name" pnpm emulator
```

6. If port `8082` is already in use by another Expo process, either keep using that process or choose a different port:

```sh
EXPO_PORT=8083 pnpm emulator
```

7. If the emulator is already open and Metro is already listening, rerunning `pnpm emulator` is safe. The script will reuse the running device, run `adb reverse`, and reopen the Expo URL.

## Troubleshooting for Agents

If `pnpm emulator` reports a missing executable, check that the SDK paths are correct:

```sh
ls "$ANDROID_SDK_ROOT/emulator/emulator"
ls "$ANDROID_SDK_ROOT/platform-tools/adb"
```

If no emulator starts, list available AVDs:

```sh
"$ANDROID_SDK_ROOT/emulator/emulator" -list-avds
```

Then rerun with the correct name:

```sh
AVD_NAME="Name_From_List" pnpm emulator
```

If the emulator opens but the app does not, confirm Expo Go is installed in the emulator. Open the Play Store in the emulator, install Expo Go, then rerun:

```sh
pnpm emulator
```

If Metro is running but the app cannot connect, rerun the port reverse manually:

```sh
"$ANDROID_SDK_ROOT/platform-tools/adb" reverse tcp:8082 tcp:8082
```

Then reopen the app URL:

```sh
"$ANDROID_SDK_ROOT/platform-tools/adb" shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8082
```

## User Instructions

Once the agent says the emulator is running, look for the Android Emulator window on the Mac.

The app should open automatically. If it does not:

1. Open the Android Emulator window.
2. Open Expo Go.
3. Select the local MacroTrack project if it appears.
4. If Expo Go shows a URL input, use:

```text
exp://127.0.0.1:8082
```

Keep the terminal command running while using the app. If Metro is stopped, the emulator will no longer receive the app bundle.

## Navigating MacroTrack

The app has a persistent bottom menu with three main buttons:

- `Nutrition`: daily macro ledger, food search, daily targets, today log, and the Statistics sub-page
- `Dishes`: custom dish gallery, dish logging, photo selection, and dish creation
- `Profile`: local profile, body measurements, goal progress, and measurement charts

From `Nutrition`, tap the daily target card or the `Stats` button in Today's log to open `Statistics`. The bottom menu should remain visible while viewing Statistics, so you can always switch to `Dishes` or `Profile`.

On `Nutrition`:

- use the search box to find foods
- tap category chips such as Protein, Carbs, Fats, Low kcal, or High kcal to filter foods
- tap a food to enter grams and add it to today's log
- long-press a logged item to edit grams
- tap the delete icon on a logged item to remove it
- tap `Export day` to share the current day's nutrition summary

On `Statistics`:

- choose `day`, `week`, `month`, or `all` to change the trend window
- review macro and body trend charts
- tap `Export summary CSV` to share the selected trend summary

On `Dishes`:

- tap a dish card to log servings used
- tap the plus button to create a dish
- optionally add a photo while creating a dish
- search and add ingredients before saving the dish

On `Profile`:

- enter body measurement values
- tap `Save record` to store the latest body record
- review weight and waist trend charts

## Stopping the Emulator Session

To stop development mode, return to the terminal running `pnpm emulator` and press:

```text
Control-C
```

The Android Emulator window may remain open. You can close it from the emulator window controls when finished.
