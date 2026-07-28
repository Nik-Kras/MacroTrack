---
name: bugfix-loop
description: Reproduce → fix → verify loop for MacroTrack bugs on the Android emulator. Boots the emulator, builds/installs the debug app wired to Metro, drives the UI with adb (taps, text, screenshots), fixes code, and re-verifies until the screenshot proves the bug is gone. Use when the user reports a bug or broken feature in the app and wants it fixed and confirmed in the running emulator.
---

# MacroTrack Emulator Bug-Fix Loop

Fix bugs against the **live app in the Android emulator**, with screenshot evidence before and after. Never claim a fix without a post-fix screenshot reproducing the original steps.

## One-time setup per session

Run these checks in order; skip any step already satisfied.

### 1. Boot the emulator (background)

```bash
/opt/homebrew/share/android-commandlinetools/emulator/emulator -avd MacroTrack_API_35 -no-snapshot-save -no-boot-anim -netdelay none -netspeed full
```

Run in background, then poll until booted:

```bash
adb shell getprop sys.boot_completed   # loop until it prints 1
```

### 2. Start Metro (background)

Port 8081 is usually taken by Docker on this machine — use **8082**:

```bash
cd /Users/nikitakrasnytskyi/Repos/MacroTrack && npx expo start --port 8082
```

Never start Metro with `CI=1` — CI mode disables watch mode and Fast Refresh, so code edits silently do nothing until a full restart. It's also unnecessary: the interactive port prompt only appears when the chosen port is already occupied.

### 3. Point the app at Metro

`adb reverse` is unreliable here (entry lists but the device-side port is dead). Instead write RN's `debug_http_host` dev preference so the app dials the host directly at `10.0.2.2:8082`. This survives app and adb restarts. The XML declaration must use quoted attributes or Android's parser silently rejects the file:

```bash
printf '%s\n' "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>" "<map>" "    <string name=\"debug_http_host\">10.0.2.2:8082</string>" "</map>" > /tmp/prefs.xml
adb push /tmp/prefs.xml /data/local/tmp/prefs.xml
adb shell "run-as com.nikkras.macrotrack cp /data/local/tmp/prefs.xml /data/data/com.nikkras.macrotrack/shared_prefs/com.nikkras.macrotrack_preferences.xml"
```

(Only possible on the debug build. Do this BEFORE first launch, or restart the app after.)

### 4. Build + install the debug app (only if not installed or native deps changed)

Gradle needs JDK 17 and the SDK path:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
cd /Users/nikitakrasnytskyi/Repos/MacroTrack && npx expo run:android --no-bundler
```

Check what's installed first: `adb shell dumpsys package com.nikkras.macrotrack | grep -E 'versionName|lastUpdateTime|pkgFlags'` — if `pkgFlags` lacks `DEBUGGABLE`, it's the stale release APK; rebuild.

### 5. Smoke-check the pipeline

Restart the app, wait ~15 s, screenshot, and confirm Metro's log shows `Bundled ... index.ts`:

```bash
adb shell am force-stop com.nikkras.macrotrack
adb shell am start -n com.nikkras.macrotrack/.MainActivity
adb exec-out screencap -p > <scratchpad>/shots/launch.png
```

If the red "Unable to load script" screen appears: verify Metro answers from the device (`adb shell 'printf "GET /status HTTP/1.0\r\n\r\n" | nc 10.0.2.2 8082'` → HTTP 200), re-check the prefs XML, restart the app.

## Driving the app

- **Screenshot**: `adb exec-out screencap -p > shots/<name>.png` — then Read the PNG. Screenshots are 1080×2400.
- **Tap**: `adb shell input tap <x> <y>` (coordinates from the full-res screenshot).
- **Long-press**: `adb shell input swipe <x> <y> <x> <y> 600`.
- **Swipe/scroll**: `adb shell input swipe <x1> <y1> <x2> <y2> 300`.
- **Type**: focus a field first, then `adb shell input text 'foo%sbar'` (`%s` = space).
- **Back**: `adb shell input keyevent 4`.
- **Crash/error logs**: `adb logcat -d -t 200 ReactNativeJS:* AndroidRuntime:E *:S` plus the Metro background-task output file.
- Known tab-bar coordinates (1080×2400): Nutrition ≈ (196, 2270), Dishes ≈ (540, 2270), Profile ≈ (880, 2270).

## The loop (per bug)

1. **Reproduce** — drive the emulator to the buggy state following the user's description. Capture a screenshot of the bug (and logs if it's a crash). If you cannot reproduce, say so and ask for clarification — do not fix blind. If the repro needs specific data (dishes, logged foods, past dates), create it through the UI.
2. **Diagnose** — locate the root cause in `src/` (~29 files; layout in README). State the hypothesis in one sentence before editing.
3. **Fix** — edit the code. Metro Fast Refresh applies JS edits live. For store/persistence/startup changes, force-stop + restart the app instead of trusting Fast Refresh. Never edit state persistence without considering existing on-device data (SQLite via expo-sqlite).
4. **Verify** — replay the exact repro steps, screenshot again, compare against the bug screenshot. The fix counts only when the new screenshot shows correct behavior. If not fixed, return to step 2 — do not stack speculative patches.
5. **Regression gate** — `cd /Users/nikitakrasnytskyi/Repos/MacroTrack && pnpm typecheck` must pass before declaring done.

## Gotchas

- `expo run:android` without JAVA_HOME fails with "Unable to locate a Java Runtime".
- The `emulator` binary is NOT on PATH; use the full `/opt/homebrew/share/android-commandlinetools/emulator/emulator` path.
- App launched before Metro is reachable → red screen; just restart the app once Metro is up.
- Fast Refresh keeps in-memory store state; when a bug involves hydration/persistence, always force-stop + relaunch to test cold-start behavior.
- Wait ~2 s after taps and ~15 s after app launch before screenshotting (bundle + font load).
