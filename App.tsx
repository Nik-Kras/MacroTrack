import { useEffect, useMemo, useState } from "react";
import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import { Tab, TabBar } from "./src/components/TabBar";
import { latestWeight, summarizeLog } from "./src/domain/analytics";
import { toLocalDateKey } from "./src/domain/dates";
import { calculateTargets, defaultProfile } from "./src/domain/targets";
import type { BodyRecord, LogEntry, MacroTotals, Profile } from "./src/domain/types";
import { getBodyRecords, getLogEntries, getProfile } from "./src/db/repository";
import { DishesScreen } from "./src/screens/DishesScreen";
import { NutritionScreen } from "./src/screens/NutritionScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { StatsScreen } from "./src/screens/StatsScreen";

export default function App() {
  const [tab, setTab] = useState<Tab>("nutrition");
  const [showStats, setShowStats] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile());
  const [bodyRecords, setBodyRecords] = useState<BodyRecord[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [dateKey, setDateKey] = useState(toLocalDateKey());
  const [ready, setReady] = useState(false);

  const refresh = async (nextDateKey = dateKey) => {
    const [savedProfile, records, entries] = await Promise.all([getProfile(), getBodyRecords(), getLogEntries(nextDateKey)]);
    if (savedProfile) setProfile(savedProfile);
    setBodyRecords(records);
    setLogEntries(entries);
    setReady(true);
  };

  useEffect(() => {
    refresh().catch(console.error);
  }, [dateKey]);

  const currentWeight = latestWeight(bodyRecords);
  const targets = useMemo(() => calculateTargets(profile, currentWeight), [profile, currentWeight]);
  const totals = useMemo<MacroTotals>(() => summarizeLog(logEntries), [logEntries]);
  const averageDeficit = targets.kcal - totals.kcal;

  const render = () => {
    if (!ready) {
      return (
        <View style={styles.loading}>
          <Text style={styles.loadingTitle}>MacroTrack</Text>
          <Text style={styles.loadingText}>Preparing local food database...</Text>
        </View>
      );
    }
    if (showStats) return <StatsScreen targets={targets} />;
    if (tab === "dishes") return <DishesScreen onChanged={refresh} />;
    if (tab === "profile") {
      return <ProfileScreen profile={profile} targets={targets} averageDeficit={averageDeficit} onChanged={refresh} />;
    }
    return (
      <NutritionScreen
        dateKey={dateKey}
        totals={totals}
        targets={targets}
        onDateChange={setDateKey}
        onChanged={() => refresh(dateKey)}
        onStats={() => setShowStats(true)}
      />
    );
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.app}>{render()}</View>
      <TabBar
        active={tab}
        onChange={(next) => {
          setShowStats(false);
          setTab(next);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFCF7", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0 },
  app: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  loadingTitle: { fontSize: 32, color: "#111827", fontWeight: "900", letterSpacing: 0 },
  loadingText: { color: "#6B7280", fontWeight: "700" }
});
