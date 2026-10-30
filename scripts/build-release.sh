#!/bin/sh
# Release APK for the phone (arm64 only), source maps uploaded to Sentry, signed with ~/.android/macrotrack-release.jks
# (passwords in ~/.gradle/gradle.properties, MACROTRACK_*; see plugins/withReleaseSigning.js).
set -e
cd "$(dirname "$0")/.."
# Source maps go to Sentry with the token from the git-ignored .env.sentry-build-plugin.
if [ -f .env.sentry-build-plugin ]; then
  set -a
  . ./.env.sentry-build-plugin
  set +a
else
  echo "No .env.sentry-build-plugin: building without uploading source maps to Sentry."
  export SENTRY_DISABLE_AUTO_UPLOAD=true
fi
CI=1 npx expo prebuild --platform android
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
echo "→ android/app/build/outputs/apk/release/app-release.apk"
