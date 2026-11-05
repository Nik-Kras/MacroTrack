// Sentry's Metro config adds debug ids to the bundle so uploaded source maps match crash stack traces.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
