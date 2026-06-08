import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MacroBar } from "../components/Bars";
import { streakFromDates } from "../domain/analytics";
import { roundHalfUp } from "../domain/rounding";
import type { Food, LogEntry, MacroTotals } from "../domain/types";
import {
  addFoodLog,
  copyPreviousDay,
  createSavedMealFromToday,
  dailySummaryCsv,
  deleteLogEntry,
  findFoodByBarcode,
  getFrequentFoods,
  getLoggedDates,
  getLogEntries,
  getRecentFoods,
  searchFoods,
  updateFoodLogGrams
} from "../db/repository";
import { shareTextFile } from "../utils/export";

type Props = {
  totals: MacroTotals;
  targets: MacroTotals;
  onChanged: () => void;
  onStats: () => void;
};

const categories: Array<{ label: string; key: keyof Food }> = [
  { label: "Protein", key: "high_protein" },
  { label: "Carbs", key: "high_carbs" },
  { label: "Fats", key: "high_fat" },
  { label: "Low kcal", key: "low_kcal" },
  { label: "High kcal", key: "high_kcal" }
];

export const NutritionScreen = ({ totals, targets, onChanged, onStats }: Props) => {
  const [query, setQuery] = useState("");
  const [activeList, setActiveList] = useState<"all" | "recent" | "frequent" | "mine">("all");
  const [category, setCategory] = useState<keyof Food | undefined>("high_protein");
  const [foods, setFoods] = useState<Food[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [pendingFood, setPendingFood] = useState<Food | null>(null);
  const [pendingEntry, setPendingEntry] = useState<LogEntry | null>(null);
  const [gramsText, setGramsText] = useState("100");
  const [barcodeText, setBarcodeText] = useState("");
  const [showBarcode, setShowBarcode] = useState(false);

  const remaining = Math.round(targets.kcal - totals.kcal);

  const refresh = async () => {
    setLog(await getLogEntries());
    setStreak(streakFromDates(await getLoggedDates()));
    if (activeList === "recent") setFoods(await getRecentFoods());
    else if (activeList === "frequent") setFoods(await getFrequentFoods());
    else setFoods(await searchFoods(query, activeList === "mine" ? undefined : category));
  };

  useEffect(() => {
    refresh().catch(console.error);
  }, [query, activeList, category]);

  const confirmFood = async () => {
    if (!pendingFood) return;
    const grams = Number(gramsText);
    if (!Number.isFinite(grams) || grams <= 0) return;
    await addFoodLog(pendingFood, grams);
    setPendingFood(null);
    await refresh();
    onChanged();
  };

  const scanBarcode = async () => {
    const barcode = barcodeText;
    if (!barcode.trim()) return;
    const food = await findFoodByBarcode(barcode.trim());
    if (food) {
      setPendingFood(food);
      setGramsText("100");
      setShowBarcode(false);
      setBarcodeText("");
    } else {
      Alert.alert("Unknown barcode", "No local match. Create a custom food with this barcode in a future edit flow.");
    }
  };

  const editEntry = async (entry: LogEntry) => {
    if (entry.source_type !== "FOOD") return;
    setPendingEntry(entry);
    setGramsText(String(entry.grams ?? 100));
  };

  const confirmEdit = async () => {
    if (!pendingEntry) return;
    const grams = Number(gramsText);
    if (!Number.isFinite(grams) || grams <= 0) return;
    await updateFoodLogGrams(pendingEntry, grams);
    setPendingEntry(null);
    await refresh();
    onChanged();
  };

  const exportDay = async () => {
    const csv = dailySummaryCsv(log);
    await shareTextFile("macrotrack-day.csv", csv);
  };

  const filteredFoods = useMemo(
    () => (activeList === "mine" ? foods.filter((food) => food.is_seed === 0) : foods),
    [foods, activeList]
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable style={styles.hero} onPress={onStats}>
        <Text style={styles.heroLabel}>Calories remaining</Text>
        <Text style={[styles.remaining, remaining < 0 && styles.over]}>{remaining}</Text>
        <Text style={styles.equation}>
          {roundHalfUp(targets.kcal)} target - {roundHalfUp(totals.kcal)} eaten
        </Text>
        <View style={styles.bars}>
          <MacroBar label="kcal" value={totals.kcal} target={targets.kcal} unit="kcal" tone="green" />
          <MacroBar label="Protein" value={totals.protein_g} target={targets.protein_g} unit="g" tone="blue" />
          <MacroBar label="Carbs" value={totals.carbs_g} target={targets.carbs_g} unit="g" tone="amber" />
          <MacroBar label="Fat" value={totals.fat_g} target={targets.fat_g} unit="g" tone="red" />
        </View>
        <View style={styles.streakRow}>
          <Ionicons name="flame-outline" size={18} color="#C2410C" />
          <Text style={styles.streak}>{streak} day streak</Text>
        </View>
      </Pressable>

      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search food or aliases" style={styles.search} />
        <Pressable style={styles.iconButton} onPress={() => setShowBarcode((value) => !value)}>
          <Ionicons name="barcode-outline" size={22} color="#111827" />
        </Pressable>
      </View>

      {showBarcode ? (
        <View style={styles.searchRow}>
          <TextInput value={barcodeText} onChangeText={setBarcodeText} placeholder="Offline barcode" style={styles.search} />
          <Pressable style={styles.confirm} onPress={scanBarcode}>
            <Text style={styles.confirmText}>Lookup</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.tabs}>
        {(["all", "recent", "frequent", "mine"] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveList(tab)} style={[styles.pill, activeList === tab && styles.pillActive]}>
            <Text style={[styles.pillText, activeList === tab && styles.pillTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {categories.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => setCategory(category === item.key ? undefined : item.key)}
            style={[styles.category, category === item.key && styles.categoryActive]}
          >
            <Text style={[styles.categoryText, category === item.key && styles.categoryTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {pendingFood || pendingEntry ? (
        <View style={styles.inlineEditor}>
          <Text style={styles.editorTitle}>{pendingFood ? `Log ${pendingFood.name}` : `Edit ${pendingEntry?.name}`}</Text>
          <View style={styles.editorRow}>
            <TextInput value={gramsText} onChangeText={setGramsText} keyboardType="numeric" style={styles.gramsInput} />
            <Pressable style={styles.confirm} onPress={pendingFood ? confirmFood : confirmEdit}>
              <Text style={styles.confirmText}>{pendingFood ? "Add" : "Save"}</Text>
            </Pressable>
            <Pressable
              style={styles.cancel}
              onPress={() => {
                setPendingFood(null);
                setPendingEntry(null);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.title}>Foods</Text>
        {filteredFoods.slice(0, 12).map((food) => (
          <Pressable
            key={food.id}
            onPress={() => {
              setPendingFood(food);
              setGramsText("100");
            }}
            style={styles.cell}
          >
            <View>
              <Text style={styles.cellTitle}>{food.name}</Text>
              <Text style={styles.meta}>
                {food.kind.toLowerCase()} · {roundHalfUp(food.kcal)} kcal / 100 g · P {food.protein_g} C {food.carbs_g} F{" "}
                {food.fat_g}
              </Text>
            </View>
            <Ionicons name="add-circle-outline" size={24} color="#188A5B" />
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={async () => {
            await copyPreviousDay();
            await refresh();
            onChanged();
          }}
        >
          <Text style={styles.actionText}>Copy yesterday</Text>
        </Pressable>
        <Pressable
          style={styles.action}
          onPress={async () => {
            await createSavedMealFromToday("Saved from today");
            Alert.alert("Saved meal", "Today's entries were saved as a reusable meal.");
          }}
        >
          <Text style={styles.actionText}>Save as meal</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={exportDay}>
          <Text style={styles.actionText}>Export day</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Today</Text>
        {log.length === 0 ? <Text style={styles.empty}>No foods logged yet.</Text> : null}
        {log.map((entry) => (
          <Pressable key={entry.id} onLongPress={() => editEntry(entry)} style={styles.cell}>
            <View>
              <Text style={styles.cellTitle}>{entry.name}</Text>
              <Text style={styles.meta}>
                {entry.grams ? `${roundHalfUp(entry.grams)} g · ` : `${entry.servings_used} serving · `}
                {roundHalfUp(entry.kcal)} kcal · P {roundHalfUp(entry.protein_g)} C {roundHalfUp(entry.carbs_g)} F{" "}
                {roundHalfUp(entry.fat_g)}
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                await deleteLogEntry(entry.id);
                await refresh();
                onChanged();
              }}
            >
              <Ionicons name="trash-outline" size={21} color="#9A3412" />
            </Pressable>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 18, gap: 18, backgroundColor: "#FFFCF7" },
  hero: { gap: 10, paddingBottom: 4 },
  heroLabel: { color: "#6B7280", fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
  remaining: { fontSize: 56, fontWeight: "900", color: "#111827", letterSpacing: 0 },
  over: { color: "#C2410C" },
  equation: { color: "#4B5563", fontSize: 15 },
  bars: { gap: 12, marginTop: 6 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  streak: { color: "#111827", fontWeight: "800" },
  searchRow: { flexDirection: "row", gap: 8 },
  search: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: "#DED6CA", borderRadius: 8, paddingHorizontal: 13 },
  iconButton: { width: 46, height: 46, borderRadius: 8, borderWidth: 1, borderColor: "#DED6CA", alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F1ECE2" },
  pillActive: { backgroundColor: "#111827" },
  pillText: { color: "#4B5563", fontWeight: "800", textTransform: "capitalize" },
  pillTextActive: { color: "#FFFFFF" },
  category: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#DED6CA" },
  categoryActive: { borderColor: "#188A5B", backgroundColor: "#E6F4EC" },
  categoryText: { color: "#4B5563", fontWeight: "800" },
  categoryTextActive: { color: "#166534" },
  section: { gap: 8 },
  title: { color: "#111827", fontWeight: "900", fontSize: 18 },
  cell: { minHeight: 64, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EEE7DC", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cellTitle: { color: "#111827", fontSize: 15, fontWeight: "800" },
  meta: { color: "#6B7280", fontSize: 12, marginTop: 3 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  action: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: "#EDE7DA" },
  actionText: { fontWeight: "800", color: "#111827" },
  inlineEditor: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: "#E6F4EC" },
  editorTitle: { color: "#111827", fontWeight: "900" },
  editorRow: { flexDirection: "row", gap: 8 },
  gramsInput: { width: 92, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: "#A7D8BD", paddingHorizontal: 10 },
  confirm: { minHeight: 42, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#188A5B", alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#FFFFFF", fontWeight: "900" },
  cancel: { minHeight: 42, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#111827", fontWeight: "800" },
  empty: { color: "#6B7280", paddingVertical: 12 }
});
