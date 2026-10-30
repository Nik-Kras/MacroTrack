#!/bin/sh
# Release APK for the phone (arm64 only), signed with ~/.android/macrotrack-release.jks
# (passwords in ~/.gradle/gradle.properties, MACROTRACK_*; see plugins/withReleaseSigning.js).
set -e
cd "$(dirname "$0")/.."
CI=1 npx expo prebuild --platform android
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
echo "→ android/app/build/outputs/apk/release/app-release.apk"
