// Signs release builds with the app's own keystore instead of the shared debug key.
// The keystore and its passwords live outside the repo, in ~/.gradle/gradle.properties:
//   MACROTRACK_STORE_FILE=/Users/<you>/.android/macrotrack-release.jks
//   MACROTRACK_STORE_PASSWORD=…
//   MACROTRACK_KEY_ALIAS=macrotrack
//   MACROTRACK_KEY_PASSWORD=…
// Every update must be signed with the same keystore, or Android refuses to
// install it over the old version (and her data would have to go).
const { withAppBuildGradle } = require("expo/config-plugins");

const SIGNING = `
        release {
            if (project.hasProperty('MACROTRACK_STORE_FILE')) {
                storeFile file(MACROTRACK_STORE_FILE)
                storePassword MACROTRACK_STORE_PASSWORD
                keyAlias MACROTRACK_KEY_ALIAS
                keyPassword MACROTRACK_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (!gradle.includes("MACROTRACK_STORE_FILE")) {
      // Add a release signing config next to the debug one…
      gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${SIGNING}`);
      // …and point the release build type at it (the template uses the debug key).
      gradle = gradle.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
        "$1signingConfig project.hasProperty('MACROTRACK_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
      );
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
