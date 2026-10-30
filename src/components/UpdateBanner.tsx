import Constants from "expo-constants";
import * as Linking from "expo-linking";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";

import { Txt } from "@/components/ui";
import { isNewer, LATEST_APK_URL, LATEST_RELEASE_API, releaseVersion } from "@/lib/update";
import { colors, font } from "@/theme";

const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * "Update available · Update" at the top of Nutrition (as in RHP and MamaKcal). Checks
 * the repo's latest GitHub release when the app starts and comes back to the screen (at
 * most hourly); Update opens the new APK in the browser, which downloads it and offers
 * Install. Release builds only.
 */
export function UpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null);
  const lastCheck = useRef(0);
  const current = Constants.expoConfig?.version ?? null;

  const check = useCallback(async () => {
    if (__DEV__ || Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
    lastCheck.current = Date.now();
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 10_000);
    try {
      const res = await fetch(LATEST_RELEASE_API, { headers: { Accept: "application/vnd.github+json" }, signal: abort.signal });
      if (!res.ok) return;
      const version = releaseVersion(await res.json());
      if (version && isNewer(version, current)) setLatest(version);
    } catch {
      // Offline or GitHub unreachable: try again next time.
    } finally {
      clearTimeout(timer);
    }
  }, [current]);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void check();
    });
    return () => sub.remove();
  }, [check]);

  if (!latest) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
        paddingVertical: 8,
        paddingLeft: 14,
        paddingRight: 8,
        backgroundColor: colors.card2,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.accent + "88",
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt style={{ fontSize: 14, fontFamily: font.b }}>Update available</Txt>
        <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 1 }}>{`MacroTrack ${latest.replace(/^v/, "")}`}</Txt>
      </View>
      <Pressable
        onPress={() => Linking.openURL(LATEST_APK_URL).catch(() => {})}
        accessibilityLabel={`Update MacroTrack to ${latest.replace(/^v/, "")}`}
        style={{ backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 }}
      >
        <Txt style={{ fontFamily: font.xb, fontSize: 14, color: colors.bg }}>Update</Txt>
      </Pressable>
    </View>
  );
}
