import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MacroBar } from "../components/Bars";
import { TrendChart } from "../components/TrendChart";
import { latestWeight, projectTargetDate, weightProgress } from "../domain/analytics";
import { roundHalfUp } from "../domain/rounding";
import type { BodyRecord, MacroTotals, Profile } from "../domain/types";
import { getBodyRecords, saveBodyRecord } from "../db/repository";
import { persistLocalImage } from "../utils/localMedia";

type Props = {
  profile: Profile;
  targets: MacroTotals;
  averageDeficit: number;
  onChanged: () => void;
};

type BodyMetricKey = "weight_kg" | "waist_cm" | "bicep_cm" | "chest_cm" | "leg_both_cm" | "single_leg_cm";

export const ProfileScreen = ({ profile, targets, averageDeficit, onChanged }: Props) => {
  const [records, setRecords] = useState<BodyRecord[]>([]);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bicep, setBicep] = useState("");
  const [chest, setChest] = useState("");
  const [legs, setLegs] = useState("");
  const [singleLeg, setSingleLeg] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const refresh = async () => setRecords(await getBodyRecords());

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  const currentWeight = latestWeight(records);
  const startWeight = records.find((record) => record.weight_kg !== null)?.weight_kg ?? currentWeight;
  const projection = projectTargetDate(currentWeight, profile.desired_weight_kg, averageDeficit);
  const metricText = (current: number | null | undefined, desired: number | null | undefined, unit: string) =>
    `${current ? roundHalfUp(current) : "--"}${unit} -> ${desired ? roundHalfUp(desired) : "--"}${unit}`;
  const metricValue = (key: BodyMetricKey, direction: "first" | "latest") => {
    const list = direction === "first" ? records : [...records].reverse();
    return list.find((record) => record[key] !== null)?.[key] ?? null;
  };
  const metricProgress = (key: BodyMetricKey, desired: number | null) => {
    const first = metricValue(key, "first");
    const latest = metricValue(key, "latest");
    if (first === null || latest === null || desired === null) return null;
    return weightProgress(first, latest, desired);
  };
  const metricRows: Array<{ label: string; key: BodyMetricKey; desired: number | null; unit: string }> = [
    { label: "Weight", key: "weight_kg", desired: profile.desired_weight_kg, unit: " kg" },
    { label: "Waist", key: "waist_cm", desired: profile.desired_waist_cm, unit: " cm" },
    { label: "Bicep", key: "bicep_cm", desired: profile.desired_bicep_cm, unit: " cm" },
    { label: "Chest", key: "chest_cm", desired: profile.desired_chest_cm, unit: " cm" },
    { label: "Both legs", key: "leg_both_cm", desired: profile.desired_leg_both_cm, unit: " cm" },
    { label: "Single leg", key: "single_leg_cm", desired: profile.desired_single_leg_cm, unit: " cm" }
  ];

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) {
      try {
        setPhotoUri(persistLocalImage(uri, "body"));
      } catch {
        Alert.alert("Photo not saved", "MacroTrack could not copy that image into local app storage.");
      }
    }
  };

  const save = async () => {
    const saved = await saveBodyRecord({
      weight_kg: Number(weight) || null,
      waist_cm: Number(waist) || null,
      bicep_cm: Number(bicep) || null,
      chest_cm: Number(chest) || null,
      leg_both_cm: Number(legs) || null,
      single_leg_cm: Number(singleLeg) || null,
      photo_uri: photoUri ?? null
    });
    if (!saved) {
      Alert.alert("Add a record", "Enter at least one measurement or attach a progress photo.");
      return;
    }
    setWeight("");
    setWaist("");
    setBicep("");
    setChest("");
    setLegs("");
    setSingleLeg("");
    setPhotoUri(undefined);
    setShowRecordForm(false);
    await refresh();
    onChanged();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>Local profile</Text>
        <Text style={styles.title}>{profile.name || "MacroTrack"}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Targets</Text>
        <Text style={styles.meta}>
          {profile.goal_type.replace("_", " ")} · {roundHalfUp(currentWeight)} kg · {roundHalfUp(targets.kcal)} kcal
        </Text>
        <MacroBar
          label="Weight goal"
          value={weightProgress(startWeight, currentWeight, profile.desired_weight_kg) * 100}
          target={100}
          unit="%"
          tone="green"
          variant="dark"
        />
        <Text style={styles.meta}>
          From {roundHalfUp(startWeight)} kg to desired {profile.desired_weight_kg} kg
          {projection ? ` · projected ${projection.toLocaleDateString()}` : " · projection needs more stable history"}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Profile data</Text>
        <View style={styles.dataGrid}>
          <View style={styles.dataCell}>
            <Text style={styles.dataLabel}>Sex</Text>
            <Text style={styles.dataValue}>{profile.sex}</Text>
          </View>
          <View style={styles.dataCell}>
            <Text style={styles.dataLabel}>Birth date</Text>
            <Text style={styles.dataValue}>{profile.birth_date}</Text>
          </View>
          <View style={styles.dataCell}>
            <Text style={styles.dataLabel}>Height</Text>
            <Text style={styles.dataValue}>{roundHalfUp(profile.height_cm)} cm</Text>
          </View>
          <View style={styles.dataCell}>
            <Text style={styles.dataLabel}>Activity</Text>
            <Text style={styles.dataValue}>{profile.activity_level.replace("_", " ")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Body parameters</Text>
        <View style={styles.dataGrid}>
          {metricRows.map((metric) => {
            const current = metricValue(metric.key, "latest");
            const progress = metricProgress(metric.key, metric.desired);
            return (
              <View key={metric.key} style={styles.dataCell}>
                <Text style={styles.dataLabel}>{metric.label}</Text>
                <Text style={styles.dataValue}>{metricText(current, metric.desired, metric.unit)}</Text>
                <View style={styles.metricTrack}>
                  <View style={[styles.metricFill, { width: `${(progress ?? 0) * 100}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.form}>
        <Pressable style={styles.secondary} onPress={() => setShowRecordForm((value) => !value)}>
          <Text style={styles.secondaryText}>{showRecordForm ? "Hide body record form" : "Add body record"}</Text>
        </Pressable>
        {showRecordForm ? (
          <>
            <View style={styles.grid}>
              <TextInput value={weight} onChangeText={setWeight} placeholder="Weight kg" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.input} />
              <TextInput value={waist} onChangeText={setWaist} placeholder="Waist cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.input} />
              <TextInput value={bicep} onChangeText={setBicep} placeholder="Bicep cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.input} />
              <TextInput value={chest} onChangeText={setChest} placeholder="Chest cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.input} />
              <TextInput value={legs} onChangeText={setLegs} placeholder="Both legs cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.input} />
              <TextInput value={singleLeg} onChangeText={setSingleLeg} placeholder="Single leg cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.input} />
            </View>
            <Pressable style={styles.secondary} onPress={pickPhoto}>
              <Text style={styles.secondaryText}>{photoUri ? "Progress photo attached" : "Attach local progress photo"}</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={save}>
              <Text style={styles.primaryText}>Save record</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <TrendChart title="Weight trend" values={records.map((record) => record.weight_kg).filter((value): value is number => value !== null)} suffix="kg" color="#188A5B" />
      <TrendChart title="Waist trend" values={records.map((record) => record.waist_cm).filter((value): value is number => value !== null)} suffix="cm" color="#C2410C" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 18, gap: 18, backgroundColor: "#090F18" },
  eyebrow: { color: "#8B96A8", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#F8FAFC", fontSize: 30, fontWeight: "900", letterSpacing: 0 },
  panel: { gap: 10, padding: 12, borderRadius: 8, backgroundColor: "#111827", borderWidth: 1, borderColor: "#253246" },
  panelTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "900" },
  meta: { color: "#8B96A8", fontSize: 13 },
  dataGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dataCell: { flexBasis: "48%", minHeight: 74, borderRadius: 8, backgroundColor: "#0B1220", borderWidth: 1, borderColor: "#2B374D", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 8 },
  dataLabel: { color: "#8B96A8", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  dataValue: { color: "#F8FAFC", fontSize: 14, fontWeight: "900", marginTop: 4, textTransform: "capitalize" },
  metricTrack: { height: 6, marginTop: 8, borderRadius: 3, overflow: "hidden", backgroundColor: "#263044" },
  metricFill: { height: "100%", borderRadius: 3, backgroundColor: "#22C55E" },
  form: { gap: 10, padding: 12, borderRadius: 8, backgroundColor: "#111827", borderWidth: 1, borderColor: "#253246" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { flexBasis: "48%", minHeight: 46, borderWidth: 1, borderColor: "#2B374D", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#0B1220", color: "#F8FAFC" },
  secondary: { minHeight: 44, borderRadius: 8, backgroundColor: "#121A27", borderWidth: 1, borderColor: "#253246", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#D7E7FF", fontWeight: "800" },
  primary: { minHeight: 46, borderRadius: 8, backgroundColor: "#2388FF", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" }
});
