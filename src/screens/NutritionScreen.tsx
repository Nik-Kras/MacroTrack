import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MacroBar } from "../components/Bars";
import { streakFromDates } from "../domain/analytics";
import { addDays, toLocalDateKey } from "../domain/dates";
import { roundHalfUp } from "../domain/rounding";
import type { CustomDish, Food, LogEntry, MacroTotals } from "../domain/types";
import {
  addFoodLog,
  copyPreviousDay,
  createCustomFood,
  createSavedMealFromToday,
  dailySummaryCsv,
  deleteLogEntry,
  findFoodByBarcode,
  getCustomDishes,
  getFrequentFoods,
  getLoggedDates,
  getLogEntries,
  getRecentFoods,
  logDish,
  searchFoods,
  updateFoodLogGrams
} from "../db/repository";
import { shareTextFile } from "../utils/export";

type Props = {
  dateKey: string;
  totals: MacroTotals;
  targets: MacroTotals;
  onDateChange: (dateKey: string) => void;
  onChanged: () => void;
  onStats: () => void;
};

type SearchMode = "all" | "recent" | "frequent" | "my_foods";
type AddMode = "food" | "product" | "dish";

const categories: Array<{ label: string; key: keyof Food }> = [
  { label: "Protein", key: "high_protein" },
  { label: "Carbs", key: "high_carbs" },
  { label: "Fats", key: "high_fat" },
  { label: "Low kcal", key: "low_kcal" },
  { label: "High kcal", key: "high_kcal" }
];

const macroSplit = (totals: MacroTotals) => {
  const proteinKcal = totals.protein_g * 4;
  const carbsKcal = totals.carbs_g * 4;
  const fatKcal = totals.fat_g * 9;
  const sum = proteinKcal + carbsKcal + fatKcal || 1;
  return {
    protein: (proteinKcal / sum) * 100,
    carbs: (carbsKcal / sum) * 100,
    fat: (fatKcal / sum) * 100
  };
};

export const NutritionScreen = ({ dateKey, totals, targets, onDateChange, onChanged, onStats }: Props) => {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [addMode, setAddMode] = useState<AddMode>("food");
  const [category, setCategory] = useState<keyof Food | undefined>();
  const [foods, setFoods] = useState<Food[]>([]);
  const [dishes, setDishes] = useState<CustomDish[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [pendingFood, setPendingFood] = useState<Food | null>(null);
  const [pendingEntry, setPendingEntry] = useState<LogEntry | null>(null);
  const [pendingDish, setPendingDish] = useState<CustomDish | null>(null);
  const [amountText, setAmountText] = useState("100");
  const [barcodeText, setBarcodeText] = useState("");
  const [newFood, setNewFood] = useState({
    name: "",
    barcode: "",
    kcal: "",
    protein: "",
    carbs: "",
    fat: ""
  });

  const todayKey = toLocalDateKey();
  const remaining = targets.kcal - totals.kcal;
  const split = useMemo(() => macroSplit(totals), [totals]);
  const diaryTitle = dateKey === todayKey ? "Today" : dateKey;

  const refresh = async () => {
    setLog(await getLogEntries(dateKey));
    setStreak(streakFromDates(await getLoggedDates(), todayKey));
    setDishes(await getCustomDishes());
    if (searchMode === "recent") setFoods(await getRecentFoods());
    else if (searchMode === "frequent") setFoods(await getFrequentFoods());
    else {
      const rows = await searchFoods(query, searchMode === "my_foods" ? undefined : category);
      setFoods(searchMode === "my_foods" ? rows.filter((food) => food.is_seed === 0) : rows);
    }
  };

  useEffect(() => {
    refresh().catch(console.error);
  }, [query, searchMode, category, dateKey]);

  const confirmFood = async () => {
    if (!pendingFood) return;
    const grams = Number(amountText);
    if (!Number.isFinite(grams) || grams <= 0) return;
    await addFoodLog(pendingFood, grams, dateKey);
    setPendingFood(null);
    setAmountText("100");
    await refresh();
    onChanged();
  };

  const confirmDish = async () => {
    if (!pendingDish) return;
    const servings = Number(amountText);
    if (!Number.isFinite(servings) || servings <= 0) return;
    await logDish(pendingDish, servings, dateKey);
    setPendingDish(null);
    setAmountText("1");
    await refresh();
    onChanged();
  };

  const confirmEdit = async () => {
    if (!pendingEntry) return;
    const grams = Number(amountText);
    if (!Number.isFinite(grams) || grams <= 0) return;
    await updateFoodLogGrams(pendingEntry, grams);
    setPendingEntry(null);
    await refresh();
    onChanged();
  };

  const lookupBarcode = async () => {
    const barcode = barcodeText.trim();
    if (!barcode) return;
    const food = await findFoodByBarcode(barcode);
    if (food) {
      setPendingFood(food);
      setAmountText("100");
      setAddMode("food");
    } else {
      setAddMode("product");
      setNewFood((state) => ({ ...state, barcode }));
      Alert.alert("Unknown barcode", "No local match. Add it as your own product below.");
    }
  };

  const saveCustomProduct = async () => {
    const name = newFood.name.trim();
    const protein = Number(newFood.protein);
    const carbs = Number(newFood.carbs);
    const fat = Number(newFood.fat);
    const kcal = Number(newFood.kcal) || protein * 4 + carbs * 4 + fat * 9;
    if (!name || [protein, carbs, fat, kcal].some((value) => !Number.isFinite(value) || value < 0)) return;
    const food = await createCustomFood({
      name,
      barcode: newFood.barcode.trim() || null,
      kcal,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat
    });
    if (food) {
      setNewFood({ name: "", barcode: "", kcal: "", protein: "", carbs: "", fat: "" });
      setPendingFood(food);
      setAmountText("100");
      setAddMode("food");
      await refresh();
    }
  };

  const exportDay = async () => {
    await shareTextFile(`macrotrack-${dateKey}.csv`, dailySummaryCsv(log));
  };

  const selectFood = (food: Food) => {
    setPendingFood(food);
    setPendingEntry(null);
    setPendingDish(null);
    setAmountText("100");
  };

  const selectDish = (dish: CustomDish) => {
    setPendingDish(dish);
    setPendingFood(null);
    setPendingEntry(null);
    setAmountText("1");
  };

  const selectedEditorTitle = pendingFood
    ? `Add ${pendingFood.name}`
    : pendingDish
      ? `Add ${pendingDish.name}`
      : pendingEntry
        ? `Edit ${pendingEntry.name}`
        : null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.dateRow}>
        <Pressable style={styles.dateButton} onPress={() => onDateChange(addDays(dateKey, -1))}>
          <Ionicons name="chevron-back-outline" size={22} color="#111827" />
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={styles.dateLabel}>{diaryTitle}</Text>
          <Text style={styles.dateMeta}>{log.length} entries logged</Text>
        </View>
        <Pressable style={styles.dateButton} onPress={() => onDateChange(addDays(dateKey, 1))}>
          <Ionicons name="chevron-forward-outline" size={22} color="#111827" />
        </Pressable>
      </View>

      <Pressable style={styles.hero} onPress={onStats}>
        <Text style={styles.heroLabel}>Remaining</Text>
        <View style={styles.equationRow}>
          <Text style={[styles.remaining, remaining < 0 && styles.over]}>{roundHalfUp(remaining)}</Text>
          <View style={styles.equationBlocks}>
            <View style={styles.equationBlock}>
              <Text style={styles.equationNumber}>{roundHalfUp(targets.kcal)}</Text>
              <Text style={styles.equationText}>Goal</Text>
            </View>
            <Text style={styles.operator}>-</Text>
            <View style={styles.equationBlock}>
              <Text style={styles.equationNumber}>{roundHalfUp(totals.kcal)}</Text>
              <Text style={styles.equationText}>Food</Text>
            </View>
          </View>
        </View>
        <View style={styles.splitTrack}>
          <View style={[styles.splitProtein, { flex: split.protein }]} />
          <View style={[styles.splitCarbs, { flex: split.carbs }]} />
          <View style={[styles.splitFat, { flex: split.fat }]} />
        </View>
        <View style={styles.bars}>
          <MacroBar label="Calories" value={totals.kcal} target={targets.kcal} unit="kcal" tone="green" />
          <MacroBar label="Protein" value={totals.protein_g} target={targets.protein_g} unit="g" tone="blue" />
          <MacroBar label="Carbs" value={totals.carbs_g} target={targets.carbs_g} unit="g" tone="amber" />
          <MacroBar label="Fat" value={totals.fat_g} target={targets.fat_g} unit="g" tone="red" />
        </View>
        <View style={styles.streakRow}>
          <Ionicons name="flame-outline" size={18} color="#C2410C" />
          <Text style={styles.streak}>{streak} day streak</Text>
        </View>
      </Pressable>

      <View style={styles.addTabs}>
        {[
          { key: "food", label: "Add food", icon: "add-circle-outline" },
          { key: "product", label: "Create product", icon: "create-outline" },
          { key: "dish", label: "Log dish", icon: "restaurant-outline" }
        ].map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setAddMode(item.key as AddMode)}
            style={[styles.addTab, addMode === item.key && styles.addTabActive]}
          >
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={addMode === item.key ? "#FFFFFF" : "#111827"} />
            <Text style={[styles.addTabText, addMode === item.key && styles.addTabTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {addMode === "food" ? (
        <View style={styles.panel}>
          <View style={styles.searchRow}>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search foods, products, aliases" style={styles.search} />
            <TextInput value={barcodeText} onChangeText={setBarcodeText} placeholder="Barcode" style={styles.barcode} />
            <Pressable style={styles.iconButton} onPress={lookupBarcode}>
              <Ionicons name="barcode-outline" size={22} color="#111827" />
            </Pressable>
          </View>
          <View style={styles.modeRow}>
            {(["all", "recent", "frequent", "my_foods"] as const).map((mode) => (
              <Pressable key={mode} onPress={() => setSearchMode(mode)} style={[styles.pill, searchMode === mode && styles.pillActive]}>
                <Text style={[styles.pillText, searchMode === mode && styles.pillTextActive]}>{mode.replace("_", " ")}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
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
          {foods.slice(0, 14).map((food) => (
            <Pressable key={food.id} onPress={() => selectFood(food)} style={styles.cell}>
              <View style={styles.cellCopy}>
                <Text style={styles.cellTitle}>{food.name}</Text>
                <Text style={styles.meta}>
                  {food.is_seed ? "database" : "my food"} · {food.kind.toLowerCase()} · {roundHalfUp(food.kcal)} kcal / 100 g
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={25} color="#188A5B" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {addMode === "product" ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Create your own product</Text>
          <TextInput value={newFood.name} onChangeText={(name) => setNewFood((state) => ({ ...state, name }))} placeholder="Product name" style={styles.input} />
          <TextInput value={newFood.barcode} onChangeText={(barcode) => setNewFood((state) => ({ ...state, barcode }))} placeholder="Barcode optional" style={styles.input} />
          <View style={styles.nutrientGrid}>
            <TextInput value={newFood.kcal} onChangeText={(kcal) => setNewFood((state) => ({ ...state, kcal }))} placeholder="kcal / 100g" keyboardType="numeric" style={styles.nutrientInput} />
            <TextInput value={newFood.protein} onChangeText={(protein) => setNewFood((state) => ({ ...state, protein }))} placeholder="Protein" keyboardType="numeric" style={styles.nutrientInput} />
            <TextInput value={newFood.carbs} onChangeText={(carbs) => setNewFood((state) => ({ ...state, carbs }))} placeholder="Carbs" keyboardType="numeric" style={styles.nutrientInput} />
            <TextInput value={newFood.fat} onChangeText={(fat) => setNewFood((state) => ({ ...state, fat }))} placeholder="Fat" keyboardType="numeric" style={styles.nutrientInput} />
          </View>
          <Pressable style={styles.primaryButton} onPress={saveCustomProduct}>
            <Text style={styles.primaryText}>Save product and log it</Text>
          </Pressable>
        </View>
      ) : null}

      {addMode === "dish" ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Log a saved dish</Text>
          {dishes.length === 0 ? <Text style={styles.empty}>No custom dishes yet. Create one in the Dishes tab, then log it here.</Text> : null}
          {dishes.map((dish) => (
            <Pressable key={dish.id} onPress={() => selectDish(dish)} style={styles.cell}>
              <View style={styles.cellCopy}>
                <Text style={styles.cellTitle}>{dish.name}</Text>
                <Text style={styles.meta}>
                  {roundHalfUp(dish.total_kcal / dish.servings)} kcal/person · P {roundHalfUp(dish.total_protein_g / dish.servings)} C{" "}
                  {roundHalfUp(dish.total_carbs_g / dish.servings)} F {roundHalfUp(dish.total_fat_g / dish.servings)}
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={25} color="#188A5B" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {selectedEditorTitle ? (
        <View style={styles.inlineEditor}>
          <Text style={styles.editorTitle}>{selectedEditorTitle}</Text>
          <View style={styles.editorRow}>
            <TextInput value={amountText} onChangeText={setAmountText} keyboardType="numeric" style={styles.amountInput} />
            <Text style={styles.unitLabel}>{pendingDish ? "servings" : "grams"}</Text>
            <Pressable style={styles.confirm} onPress={pendingDish ? confirmDish : pendingFood ? confirmFood : confirmEdit}>
              <Text style={styles.confirmText}>{pendingEntry ? "Save" : "Add to diary"}</Text>
            </Pressable>
            <Pressable
              style={styles.cancel}
              onPress={() => {
                setPendingFood(null);
                setPendingEntry(null);
                setPendingDish(null);
              }}
            >
              <Ionicons name="close-outline" size={20} color="#111827" />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={styles.action}
          onPress={async () => {
            await copyPreviousDay(dateKey);
            await refresh();
            onChanged();
          }}
        >
          <Ionicons name="copy-outline" size={17} color="#111827" />
          <Text style={styles.actionText}>Copy previous day</Text>
        </Pressable>
        <Pressable
          style={styles.action}
          onPress={async () => {
            await createSavedMealFromToday(`Meal from ${dateKey}`, dateKey);
            Alert.alert("Saved meal", "This day was saved as a reusable meal.");
          }}
        >
          <Ionicons name="bookmark-outline" size={17} color="#111827" />
          <Text style={styles.actionText}>Save day as meal</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={exportDay}>
          <Ionicons name="share-outline" size={17} color="#111827" />
          <Text style={styles.actionText}>Export day</Text>
        </Pressable>
      </View>

      <View style={styles.diary}>
        <View style={styles.diaryHeader}>
          <Text style={styles.title}>{diaryTitle} diary</Text>
          <Pressable onPress={onStats}>
            <Text style={styles.statsLink}>Stats</Text>
          </Pressable>
        </View>
        {log.length === 0 ? <Text style={styles.empty}>No entries on this day. Add food, a product, or a dish above.</Text> : null}
        {log.map((entry) => (
          <Pressable
            key={entry.id}
            onLongPress={() => {
              if (entry.source_type === "FOOD") {
                setPendingEntry(entry);
                setPendingFood(null);
                setPendingDish(null);
                setAmountText(String(entry.grams ?? 100));
              }
            }}
            style={styles.diaryCell}
          >
            <View style={styles.cellCopy}>
              <Text style={styles.cellTitle}>{entry.name}</Text>
              <Text style={styles.meta}>
                {entry.grams ? `${roundHalfUp(entry.grams)} g` : `${roundHalfUp(entry.servings_used ?? 1)} serving`} ·{" "}
                {roundHalfUp(entry.kcal)} kcal
              </Text>
            </View>
            <View style={styles.entryMacros}>
              <Text style={styles.entryMacro}>P {roundHalfUp(entry.protein_g)}</Text>
              <Text style={styles.entryMacro}>C {roundHalfUp(entry.carbs_g)}</Text>
              <Text style={styles.entryMacro}>F {roundHalfUp(entry.fat_g)}</Text>
            </View>
            <Pressable
              style={styles.deleteButton}
              onPress={async () => {
                await deleteLogEntry(entry.id);
                await refresh();
                onChanged();
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#9A3412" />
            </Pressable>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 14, gap: 14, backgroundColor: "#F7F5EF" },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  dateButton: { width: 42, height: 42, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2DED4", alignItems: "center", justifyContent: "center" },
  dateCenter: { flex: 1, alignItems: "center" },
  dateLabel: { fontSize: 20, fontWeight: "900", color: "#111827" },
  dateMeta: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginTop: 2 },
  hero: { gap: 12, padding: 14, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2DED4" },
  heroLabel: { color: "#6B7280", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  equationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  remaining: { fontSize: 52, lineHeight: 56, fontWeight: "900", color: "#111827", letterSpacing: 0 },
  over: { color: "#C2410C" },
  equationBlocks: { flexDirection: "row", alignItems: "center", gap: 9 },
  equationBlock: { alignItems: "center", minWidth: 54 },
  equationNumber: { fontSize: 17, fontWeight: "900", color: "#111827" },
  equationText: { fontSize: 11, fontWeight: "800", color: "#6B7280" },
  operator: { fontSize: 18, fontWeight: "900", color: "#9CA3AF" },
  splitTrack: { height: 13, flexDirection: "row", overflow: "hidden", borderRadius: 3, backgroundColor: "#E5E0D8" },
  splitProtein: { backgroundColor: "#2563EB" },
  splitCarbs: { backgroundColor: "#B7791F" },
  splitFat: { backgroundColor: "#C2410C" },
  bars: { gap: 11 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streak: { color: "#111827", fontWeight: "800" },
  addTabs: { flexDirection: "row", gap: 8 },
  addTab: { flex: 1, minHeight: 46, borderRadius: 8, borderWidth: 1, borderColor: "#D8D2C8", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", gap: 3 },
  addTabActive: { backgroundColor: "#111827", borderColor: "#111827" },
  addTabText: { fontSize: 11, color: "#111827", fontWeight: "900" },
  addTabTextActive: { color: "#FFFFFF" },
  panel: { gap: 10, padding: 12, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2DED4" },
  panelTitle: { color: "#111827", fontSize: 17, fontWeight: "900" },
  searchRow: { flexDirection: "row", gap: 8 },
  search: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: "#D8D2C8", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#FFFCF7" },
  barcode: { width: 92, minHeight: 44, borderWidth: 1, borderColor: "#D8D2C8", borderRadius: 8, paddingHorizontal: 10, backgroundColor: "#FFFCF7" },
  iconButton: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: "#D8D2C8", alignItems: "center", justifyContent: "center" },
  modeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: "#F0EDE5" },
  pillActive: { backgroundColor: "#111827" },
  pillText: { color: "#4B5563", fontWeight: "900", fontSize: 12, textTransform: "capitalize" },
  pillTextActive: { color: "#FFFFFF" },
  category: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#D8D2C8" },
  categoryActive: { borderColor: "#188A5B", backgroundColor: "#E7F3EC" },
  categoryText: { color: "#4B5563", fontWeight: "900", fontSize: 12 },
  categoryTextActive: { color: "#166534" },
  cell: { minHeight: 60, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#EEE9E0", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cellCopy: { flex: 1, minWidth: 0 },
  cellTitle: { color: "#111827", fontSize: 15, fontWeight: "900" },
  meta: { color: "#6B7280", fontSize: 12, marginTop: 3, fontWeight: "600" },
  input: { minHeight: 44, borderWidth: 1, borderColor: "#D8D2C8", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#FFFCF7" },
  nutrientGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nutrientInput: { flexBasis: "48%", minHeight: 44, borderWidth: 1, borderColor: "#D8D2C8", borderRadius: 8, paddingHorizontal: 10, backgroundColor: "#FFFCF7" },
  primaryButton: { minHeight: 46, borderRadius: 8, backgroundColor: "#188A5B", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  inlineEditor: { gap: 9, padding: 12, borderRadius: 8, backgroundColor: "#E7F3EC", borderWidth: 1, borderColor: "#A7D8BD" },
  editorTitle: { color: "#111827", fontWeight: "900", fontSize: 15 },
  editorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  amountInput: { width: 82, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: "#A7D8BD", paddingHorizontal: 10, backgroundColor: "#FFFFFF" },
  unitLabel: { color: "#4B5563", fontWeight: "800", minWidth: 46 },
  confirm: { flex: 1, minHeight: 42, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#188A5B", alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#FFFFFF", fontWeight: "900" },
  cancel: { width: 42, minHeight: 42, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  action: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2DED4" },
  actionText: { fontWeight: "900", color: "#111827", fontSize: 12 },
  diary: { gap: 8, padding: 12, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2DED4" },
  diaryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#111827", fontWeight: "900", fontSize: 18 },
  statsLink: { color: "#2563EB", fontWeight: "900" },
  diaryCell: { minHeight: 66, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#EEE9E0", flexDirection: "row", alignItems: "center", gap: 10 },
  entryMacros: { flexDirection: "row", gap: 5 },
  entryMacro: { fontSize: 11, color: "#4B5563", fontWeight: "900", backgroundColor: "#F0EDE5", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 5 },
  deleteButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  empty: { color: "#6B7280", paddingVertical: 8, fontWeight: "600" }
});
