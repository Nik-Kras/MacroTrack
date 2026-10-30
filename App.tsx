import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Txt } from "@/components/ui";
import { describeError, record, Sentry, sentryEnabled, startDiagnostics } from "@/diag/diagnostics";
import { Root } from "@/Root";
import { AppProvider } from "@/store/store";
import { colors, font } from "@/theme";

// Before the first render, so a crash while starting up is reported too.
startDiagnostics();

/** Shown instead of the app when a screen crashes (the error is reported). */
function CrashScreen({ retry }: { retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 24, gap: 14 }}>
      <Txt style={{ fontFamily: font.dB, fontSize: 22 }}>Something went wrong</Txt>
      <Txt style={{ fontSize: 14, color: colors.muted, fontFamily: font.sb, lineHeight: 20 }}>
        Your data is safe. Try again, and if it keeps happening, restart the app.
      </Txt>
      <Pressable onPress={retry} style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: "center" }}>
        <Txt style={{ fontFamily: font.xb, fontSize: 15, color: colors.bg }}>Try again</Txt>
      </Pressable>
    </View>
  );
}

/** macrotrack://sentry-test (adb shell am start -d …) throws, to check that a crash reaches Sentry. */
function useSentryTest(): boolean {
  const [boom, setBoom] = useState(false);
  useEffect(() => {
    const check = (url: string | null) => {
      if (url?.includes("sentry-test")) setBoom(true);
    };
    void Linking.getInitialURL().then(check);
    const sub = Linking.addEventListener("url", (e) => check(e.url));
    return () => sub.remove();
  }, []);
  return boom;
}

function SentryTestCrash(): never {
  throw new Error("MacroTrack Sentry verification error");
}

function App() {
  const boom = useSentryTest();
  const [loaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {loaded ? (
        <Sentry.ErrorBoundary
          onError={(error) => record("error render", describeError(error))}
          fallback={({ resetError }) => <CrashScreen retry={resetError} />}
        >
          <AppProvider>
            <Root />
            {boom && <SentryTestCrash />}
          </AppProvider>
        </Sentry.ErrorBoundary>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

// Without a DSN (development) Sentry isn't started, and wrapping would only warn.
export default sentryEnabled() ? Sentry.wrap(App) : App;
