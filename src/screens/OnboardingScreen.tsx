import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { saveOnboardingProfile } from "../db/repository";
import type { ActivityLevel, GoalType, Sex } from "../domain/types";

type Props = {
  onComplete: () => void;
};

const activityOptions: Array<{ value: ActivityLevel; label: string; detail: string }> = [
  { value: "sedentary", label: "Sedentary", detail: "Desk day" },
  { value: "lightly_active", label: "Light", detail: "1-3 sessions" },
  { value: "moderately_active", label: "Moderate", detail: "3-5 sessions" },
  { value: "very_active", label: "Very active", detail: "Hard training" },
  { value: "extra_active", label: "Athlete", detail: "Daily intense" }
];

const goalOptions: Array<{ value: GoalType; label: string }> = [
  { value: "fat_loss", label: "Fat loss" },
  { value: "maintenance", label: "Maintain" },
  { value: "muscle_gain", label: "Muscle gain" }
];

const toNumber = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const optionalNumber = (value: string) => toNumber(value) ?? null;

const isValidDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  if (date.getFullYear() !== year || date.getMonth() !== (month ?? 1) - 1 || date.getDate() !== day) return false;
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  return date <= today && age >= 13 && age <= 110;
};

export const OnboardingScreen = ({ onComplete }: Props) => {
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [birthDate, setBirthDate] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("moderately_active");
  const [goal, setGoal] = useState<GoalType>("fat_loss");
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bicep, setBicep] = useState("");
  const [chest, setChest] = useState("");
  const [legs, setLegs] = useState("");
  const [singleLeg, setSingleLeg] = useState("");
  const [desiredWeight, setDesiredWeight] = useState("");
  const [desiredWaist, setDesiredWaist] = useState("");
  const [desiredBicep, setDesiredBicep] = useState("");
  const [desiredChest, setDesiredChest] = useState("");
  const [desiredLegs, setDesiredLegs] = useState("");
  const [desiredSingleLeg, setDesiredSingleLeg] = useState("");

  const submit = async () => {
    const heightCm = toNumber(height);
    const weightKg = toNumber(weight);
    const desiredWeightKg = toNumber(desiredWeight);
    if (!birthDate.trim() || !heightCm || !weightKg || !desiredWeightKg) {
      Alert.alert("Complete setup", "Birth date, height, current weight, and desired weight are required.");
      return;
    }
    if (!isValidDateKey(birthDate.trim())) {
      Alert.alert("Birth date", "Use a real YYYY-MM-DD birth date for a user between 13 and 110 years old.");
      return;
    }

    await saveOnboardingProfile(
      {
        name: name.trim() || "MacroTrack",
        sex,
        birth_date: birthDate.trim(),
        height_cm: heightCm,
        activity_level: activity,
        goal_type: goal,
        desired_weight_kg: desiredWeightKg,
        desired_bicep_cm: optionalNumber(desiredBicep),
        desired_chest_cm: optionalNumber(desiredChest),
        desired_waist_cm: optionalNumber(desiredWaist),
        desired_leg_both_cm: optionalNumber(desiredLegs),
        desired_single_leg_cm: optionalNumber(desiredSingleLeg)
      },
      {
        weight_kg: weightKg,
        bicep_cm: optionalNumber(bicep),
        chest_cm: optionalNumber(chest),
        waist_cm: optionalNumber(waist),
        leg_both_cm: optionalNumber(legs),
        single_leg_cm: optionalNumber(singleLeg)
      }
    );
    onComplete();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>First setup</Text>
        <Text style={styles.title}>MacroTrack</Text>
        <Text style={styles.copy}>Enter your real body parameters once. These values drive Profile and your daily macro targets.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Profile</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Name optional" placeholderTextColor="#6E788A" style={styles.input} />
        <View style={styles.segmentRow}>
          {(["male", "female"] as const).map((item) => (
            <Pressable key={item} onPress={() => setSex(item)} style={[styles.segment, sex === item && styles.segmentActive]}>
              <Text style={[styles.segmentText, sex === item && styles.segmentTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.twoCol}>
          <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="Birth date YYYY-MM-DD" placeholderTextColor="#6E788A" style={styles.inputHalf} />
          <TextInput value={height} onChangeText={setHeight} placeholder="Height cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Goal</Text>
        <View style={styles.segmentRow}>
          {goalOptions.map((item) => (
            <Pressable key={item.value} onPress={() => setGoal(item.value)} style={[styles.segment, goal === item.value && styles.segmentActive]}>
              <Text style={[styles.segmentText, goal === item.value && styles.segmentTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.activityGrid}>
          {activityOptions.map((item) => (
            <Pressable key={item.value} onPress={() => setActivity(item.value)} style={[styles.activity, activity === item.value && styles.activityActive]}>
              <Text style={[styles.activityLabel, activity === item.value && styles.segmentTextActive]}>{item.label}</Text>
              <Text style={[styles.activityDetail, activity === item.value && styles.activityDetailActive]}>{item.detail}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Current body</Text>
        <View style={styles.twoCol}>
          <TextInput value={weight} onChangeText={setWeight} placeholder="Weight kg" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={waist} onChangeText={setWaist} placeholder="Waist cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={bicep} onChangeText={setBicep} placeholder="Bicep cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={chest} onChangeText={setChest} placeholder="Chest cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={legs} onChangeText={setLegs} placeholder="Both legs cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={singleLeg} onChangeText={setSingleLeg} placeholder="Single leg cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Desired body</Text>
        <View style={styles.twoCol}>
          <TextInput value={desiredWeight} onChangeText={setDesiredWeight} placeholder="Desired weight kg" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={desiredWaist} onChangeText={setDesiredWaist} placeholder="Desired waist cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={desiredBicep} onChangeText={setDesiredBicep} placeholder="Desired bicep cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={desiredChest} onChangeText={setDesiredChest} placeholder="Desired chest cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={desiredLegs} onChangeText={setDesiredLegs} placeholder="Desired legs cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
          <TextInput value={desiredSingleLeg} onChangeText={setDesiredSingleLeg} placeholder="Desired single leg cm" placeholderTextColor="#6E788A" keyboardType="numeric" style={styles.inputHalf} />
        </View>
      </View>

      <Pressable style={styles.primary} onPress={submit}>
        <Text style={styles.primaryText}>Save profile and start tracking</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 30, gap: 14, backgroundColor: "#090F18" },
  header: { gap: 8, paddingTop: 10 },
  eyebrow: { color: "#8B96A8", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#F8FAFC", fontSize: 38, fontWeight: "900", letterSpacing: 0 },
  copy: { color: "#A7B2C4", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  panel: { gap: 10, padding: 12, borderRadius: 8, backgroundColor: "#111827", borderWidth: 1, borderColor: "#253246" },
  panelTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "900" },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#2B374D", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#0B1220", color: "#F8FAFC" },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inputHalf: { flexBasis: "48%", minHeight: 46, borderWidth: 1, borderColor: "#2B374D", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#0B1220", color: "#F8FAFC" },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segment: { flex: 1, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: "#2B374D", backgroundColor: "#121A27", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  segmentActive: { backgroundColor: "#2388FF", borderColor: "#2388FF" },
  segmentText: { color: "#A7B2C4", fontWeight: "900", textTransform: "capitalize" },
  segmentTextActive: { color: "#FFFFFF" },
  activityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activity: { flexBasis: "48%", minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: "#2B374D", backgroundColor: "#121A27", justifyContent: "center", paddingHorizontal: 10 },
  activityActive: { backgroundColor: "#172B46", borderColor: "#2388FF" },
  activityLabel: { color: "#E8EEF8", fontWeight: "900" },
  activityDetail: { color: "#8B96A8", fontSize: 11, fontWeight: "700", marginTop: 3 },
  activityDetailActive: { color: "#D7E7FF" },
  primary: { minHeight: 52, borderRadius: 8, backgroundColor: "#2388FF", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 }
});
