import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MacroBar } from "../components/Bars";
import { TrendChart } from "../components/TrendChart";
import { latestWeight, projectTargetDate, weightProgress } from "../domain/analytics";
import { roundHalfUp } from "../domain/rounding";
import type { BodyRecord, MacroTotals, Profile } from "../domain/types";
import { getBodyRecords, saveBodyRecord } from "../db/repository";

type Props = {
  profile: Profile;
  targets: MacroTotals;
  averageDeficit: number;
  onChanged: () => void;
};

export const ProfileScreen = ({ profile, targets, averageDeficit, onChanged }: Props) => {
  const [records, setRecords] = useState<BodyRecord[]>([]);
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
  const projection = projectTargetDate(currentWeight, profile.desired_weight_kg, averageDeficit);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0]?.uri);
  };

  const save = async () => {
    await saveBodyRecord({
      weight_kg: Number(weight) || null,
      waist_cm: Number(waist) || null,
      bicep_cm: Number(bicep) || null,
      chest_cm: Number(chest) || null,
      leg_both_cm: Number(legs) || null,
      single_leg_cm: Number(singleLeg) || null,
      photo_uri: photoUri ?? null
    });
    setWeight("");
    setWaist("");
    setBicep("");
    setChest("");
    setLegs("");
    setSingleLeg("");
    setPhotoUri(undefined);
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
        <MacroBar label="Weight goal" value={weightProgress(80, currentWeight, profile.desired_weight_kg) * 100} target={100} unit="%" tone="green" />
        <Text style={styles.meta}>
          Desired {profile.desired_weight_kg} kg
          {projection ? ` · projected ${projection.toLocaleDateString()}` : " · projection needs more stable history"}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.panelTitle}>Add body record</Text>
        <View style={styles.grid}>
          <TextInput value={weight} onChangeText={setWeight} placeholder="Weight kg" keyboardType="numeric" style={styles.input} />
          <TextInput value={waist} onChangeText={setWaist} placeholder="Waist cm" keyboardType="numeric" style={styles.input} />
          <TextInput value={bicep} onChangeText={setBicep} placeholder="Bicep cm" keyboardType="numeric" style={styles.input} />
          <TextInput value={chest} onChangeText={setChest} placeholder="Chest cm" keyboardType="numeric" style={styles.input} />
          <TextInput value={legs} onChangeText={setLegs} placeholder="Both legs cm" keyboardType="numeric" style={styles.input} />
          <TextInput value={singleLeg} onChangeText={setSingleLeg} placeholder="Single leg cm" keyboardType="numeric" style={styles.input} />
        </View>
        <Pressable style={styles.secondary} onPress={pickPhoto}>
          <Text style={styles.secondaryText}>{photoUri ? "Progress photo attached" : "Attach local progress photo"}</Text>
        </Pressable>
        <Pressable style={styles.primary} onPress={save}>
          <Text style={styles.primaryText}>Save record</Text>
        </Pressable>
      </View>

      <TrendChart title="Weight trend" values={records.map((record) => record.weight_kg).filter((value): value is number => value !== null)} suffix="kg" color="#188A5B" />
      <TrendChart title="Waist trend" values={records.map((record) => record.waist_cm).filter((value): value is number => value !== null)} suffix="cm" color="#C2410C" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 18, gap: 18, backgroundColor: "#FFFCF7" },
  eyebrow: { color: "#6B7280", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#111827", fontSize: 30, fontWeight: "900", letterSpacing: 0 },
  panel: { gap: 10 },
  panelTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  meta: { color: "#6B7280", fontSize: 13 },
  form: { gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { flexBasis: "48%", minHeight: 46, borderWidth: 1, borderColor: "#DED6CA", borderRadius: 8, paddingHorizontal: 12 },
  secondary: { minHeight: 44, borderRadius: 8, backgroundColor: "#EDE7DA", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#111827", fontWeight: "800" },
  primary: { minHeight: 46, borderRadius: 8, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" }
});
