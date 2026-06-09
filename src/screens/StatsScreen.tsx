import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TrendChart } from "../components/TrendChart";
import { addDays, daysBetween, toLocalDateKey } from "../domain/dates";
import { roundHalfUp } from "../domain/rounding";
import type { MacroTotals } from "../domain/types";
import { getBodyRecords, getSpanTotals } from "../db/repository";
import { shareTextFile } from "../utils/export";

type Span = "day" | "week" | "month" | "all";

export const StatsScreen = ({ targets }: { targets: MacroTotals }) => {
  const [span, setSpan] = useState<Span>("week");
  const [totals, setTotals] = useState<Array<MacroTotals & { log_date: string }>>([]);
  const [weights, setWeights] = useState<number[]>([]);
  const today = toLocalDateKey();
  const from = useMemo(() => {
    if (span === "day") return today;
    if (span === "week") return addDays(today, -6);
    if (span === "month") return addDays(today, -29);
    return "1970-01-01";
  }, [span, today]);

  useEffect(() => {
    getSpanTotals(from, today).then(setTotals).catch(console.error);
    getBodyRecords()
      .then((rows) => setWeights(rows.map((row) => row.weight_kg).filter((value): value is number => value !== null)))
      .catch(console.error);
  }, [from, today]);

  const totalKcal = totals.reduce((sum, row) => sum + row.kcal, 0);
  const spanDays = span === "all" ? Math.max(totals.length, 1) : Math.max(daysBetween(from, today) + 1, 1);
  const deficit = totalKcal - targets.kcal * spanDays;

  const exportSummary = async () => {
    const csv = ["date,kcal,protein_g,fat_g,carbs_g", ...totals.map((row) => `${row.log_date},${row.kcal},${row.protein_g},${row.fat_g},${row.carbs_g}`)].join("\n");
    await shareTextFile("macrotrack-summary.csv", csv);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>Macro trends</Text>
        <Text style={styles.title}>Statistics</Text>
      </View>
      <View style={styles.tabs}>
        {(["day", "week", "month", "all"] as const).map((item) => (
          <Pressable key={item} onPress={() => setSpan(item)} style={[styles.pill, span === item && styles.pillActive]}>
            <Text style={[styles.pillText, span === item && styles.pillTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>Deficit / surplus</Text>
          <Text style={[styles.summaryNumber, deficit > 0 && styles.surplus]}>{roundHalfUp(deficit)} kcal</Text>
        </View>
        <Pressable style={styles.export} onPress={exportSummary}>
          <Text style={styles.exportText}>Export summary CSV</Text>
        </Pressable>
      </View>
      <TrendChart title="Calories" values={totals.map((row) => row.kcal)} color="#188A5B" suffix="kcal" />
      <TrendChart title="Protein" values={totals.map((row) => row.protein_g)} color="#2563EB" suffix="g" />
      <TrendChart title="Carbs" values={totals.map((row) => row.carbs_g)} color="#B7791F" suffix="g" />
      <TrendChart title="Fat" values={totals.map((row) => row.fat_g)} color="#C2410C" suffix="g" />
      <TrendChart title="Body weight" values={weights} color="#2E9BFF" suffix="kg" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 18, gap: 18, backgroundColor: "#090F18" },
  eyebrow: { color: "#8B96A8", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#F8FAFC", fontSize: 30, fontWeight: "900", letterSpacing: 0 },
  tabs: { flexDirection: "row", gap: 8 },
  pill: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 8, backgroundColor: "#121A27", borderWidth: 1, borderColor: "#253246" },
  pillActive: { backgroundColor: "#2388FF", borderColor: "#2388FF" },
  pillText: { color: "#A7B2C4", fontWeight: "800", textTransform: "capitalize" },
  pillTextActive: { color: "#FFFFFF" },
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, backgroundColor: "#111827", borderWidth: 1, borderColor: "#253246" },
  summaryLabel: { color: "#8B96A8", fontWeight: "800" },
  summaryNumber: { color: "#22C55E", fontSize: 24, fontWeight: "900" },
  surplus: { color: "#F87171" },
  export: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: "#121A27", borderWidth: 1, borderColor: "#253246" },
  exportText: { color: "#D7E7FF", fontWeight: "800" }
});
