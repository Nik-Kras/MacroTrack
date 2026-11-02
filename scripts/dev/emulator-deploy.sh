#!/usr/bin/env bash
set -euo pipefail

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home}"
AVD_NAME="${AVD_NAME:-MacroTrack_API_35}"
EXPO_PORT="${EXPO_PORT:-8082}"

ADB="$ANDROID_SDK_ROOT/platform-tools/adb"
EMULATOR="$ANDROID_SDK_ROOT/emulator/emulator"

if ! "$ADB" devices | grep -q "device$"; then
  "$EMULATOR" -avd "$AVD_NAME" >/tmp/macrotrack-emulator.log 2>&1 &
fi

"$ADB" wait-for-device
until "$ADB" shell getprop sys.boot_completed | grep -q "1"; do
  sleep 2
done

"$ADB" reverse "tcp:$EXPO_PORT" "tcp:$EXPO_PORT"
pnpm exec expo start --port "$EXPO_PORT" --host localhost &
METRO_PID=$!
sleep 6
"$ADB" shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:$EXPO_PORT" || true
wait "$METRO_PID"
