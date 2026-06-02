#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${AVD_NAME:-MacroTrack_API_35}"
EXPO_PORT="${EXPO_PORT:-8082}"
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}}"
JAVA_HOME_DEFAULT="/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
export PATH="$SDK_ROOT/emulator:$SDK_ROOT/platform-tools:/opt/homebrew/opt/openjdk/bin:$PATH"

ADB="$SDK_ROOT/platform-tools/adb"
EMULATOR="$SDK_ROOT/emulator/emulator"
EXPO_URL="exp://127.0.0.1:$EXPO_PORT"

log() {
  printf '\033[1;32m[emulator]\033[0m %s\n' "$*"
}

fail() {
  printf '\033[1;31m[emulator]\033[0m %s\n' "$*" >&2
  exit 1
}

require_file() {
  [[ -x "$1" ]] || fail "Missing executable: $1"
}

device_connected() {
  "$ADB" devices | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'
}

boot_completed() {
  "$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q '^1$'
}

wait_for_boot() {
  log "Waiting for Android to boot..."
  "$ADB" wait-for-device
  for _ in $(seq 1 90); do
    if boot_completed; then
      log "Android booted."
      return
    fi
    sleep 2
  done
  fail "Timed out waiting for emulator boot."
}

port_listening() {
  lsof -nP -iTCP:"$EXPO_PORT" -sTCP:LISTEN >/dev/null 2>&1
}

open_app() {
  log "Routing emulator port $EXPO_PORT to Metro."
  "$ADB" reverse "tcp:$EXPO_PORT" "tcp:$EXPO_PORT"
  log "Opening MacroTrack at $EXPO_URL"
  "$ADB" shell am start -a android.intent.action.VIEW -d "$EXPO_URL" >/dev/null
}

require_file "$ADB"
require_file "$EMULATOR"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is not installed or not on PATH."

cd "$REPO_ROOT"

if device_connected; then
  log "Using already-running Android emulator."
else
  log "Starting AVD '$AVD_NAME'."
  "$EMULATOR" -avd "$AVD_NAME" -no-metrics -netdelay none -netspeed full >/tmp/macrotrack-emulator.log 2>&1 &
fi

wait_for_boot

if port_listening; then
  log "Metro already appears to be listening on port $EXPO_PORT."
  open_app
  log "Done. Existing Metro process is still running."
else
  log "Starting Expo Metro on port $EXPO_PORT."
  open_app_after_delay() {
    for _ in $(seq 1 60); do
      if port_listening; then
        open_app
        return
      fi
      sleep 1
    done
  }
  open_app_after_delay &
  pnpm exec expo start --localhost --port "$EXPO_PORT"
fi
