import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { MacroDatabase, addBodyRecord, getBodyRecords } from '../db/database';
import { BodyRecord, Profile } from '../types';
import { colors, shadow } from '../theme';
import { computeTargets } from '../lib/math';
import { ProgressBar } from '../components/ProgressBar';
import { MiniChart } from '../components/MiniChart';
import { Section } from '../components/Section';
import { StatPill } from '../components/StatPill';

type Props = {
  db: MacroDatabase;
  profile: Profile;
  latestBody: BodyRecord;
  refreshToken: number;
  onChanged: () => void;
};

const fields = [
  ['weight_kg', 'Weight', 'kg'],
  ['bicep_cm', 'Bicep', 'cm'],
  ['chest_cm', 'Chest', 'cm'],
  ['waist_cm', 'Waist', 'cm'],
  ['leg_both_cm', 'Both legs', 'cm'],
  ['single_leg_cm', 'Single leg', 'cm']
] as const;

export function ProfileScreen({ db, profile, latestBody, refreshToken, onChanged }: Props) {
  const [records, setRecords] = useState<BodyRecord[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({
    weight_kg: String(latestBody.weight_kg ?? ''),
    bicep_cm: String(latestBody.bicep_cm ?? ''),
    chest_cm: String(latestBody.chest_cm ?? ''),
    waist_cm: String(latestBody.waist_cm ?? ''),
    leg_both_cm: String(latestBody.leg_both_cm ?? ''),
    single_leg_cm: String(latestBody.single_leg_cm ?? '')
  });

  const refresh = useCallback(async () => setRecords(await getBodyRecords(db)), [db]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);

  const targets = useMemo(() => computeTargets(profile, latestBody.weight_kg ?? 80), [profile, latestBody.weight_kg]);

  async function saveBodyRecord() {
    await addBodyRecord(db, {
      weight_kg: num(draft.weight_kg),
      bicep_cm: num(draft.bicep_cm),
      chest_cm: num(draft.chest_cm),
      waist_cm: num(draft.waist_cm),
      leg_both_cm: num(draft.leg_both_cm),
      single_leg_cm: num(draft.single_leg_cm)
    });
    await refresh();
    onChanged();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Local profile</Text>
        <Text style={styles.title}>{profile.name ?? 'MacroTrack'}</Text>
        <View style={styles.pills}>
          <StatPill label="BMR" value={`${targets.bmr}`} />
          <StatPill label="TDEE" value={`${targets.tdee}`} />
          <StatPill label="Goal" value={labelGoal(profile.goal_type)} />
        </View>
      </View>

      <Section title="Goal progress">
        <View style={styles.card}>
          <GoalProgress label="Weight" current={latestBody.weight_kg} start={records[0]?.weight_kg ?? latestBody.weight_kg} target={profile.desired_weight_kg} unit="kg" />
          <GoalProgress label="Bicep" current={latestBody.bicep_cm} start={records[0]?.bicep_cm ?? latestBody.bicep_cm} target={profile.desired_bicep_cm} unit="cm" />
          <GoalProgress label="Chest" current={latestBody.chest_cm} start={records[0]?.chest_cm ?? latestBody.chest_cm} target={profile.desired_chest_cm} unit="cm" />
          <GoalProgress label="Waist" current={latestBody.waist_cm} start={records[0]?.waist_cm ?? latestBody.waist_cm} target={profile.desired_waist_cm} unit="cm" />
        </View>
      </Section>

      <Section title="Add body record">
        <View style={styles.formGrid}>
          {fields.map(([key, label, unit]) => (
            <View key={key} style={styles.field}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                keyboardType="decimal-pad"
                value={draft[key]}
                onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))}
                style={styles.input}
              />
              <Text style={styles.unit}>{unit}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.primaryButton} onPress={saveBodyRecord}>
          <Plus size={18} color={colors.card} />
          <Text style={styles.primaryText}>Save record</Text>
        </Pressable>
      </Section>

      <Section title="Weight trend">
        <View style={styles.card}>
          <MiniChart values={records.map((record) => record.weight_kg ?? NaN)} color={colors.green} />
        </View>
      </Section>

      <Section title="Measurement trend">
        <View style={styles.card}>
          <MiniChart values={records.map((record) => record.waist_cm ?? NaN)} color={colors.coral} emptyLabel="Add waist records to chart" />
        </View>
      </Section>
    </ScrollView>
  );
}

function GoalProgress({
  label,
  current,
  start,
  target,
  unit
}: {
  label: string;
  current: number | null;
  start: number | null;
  target: number | null;
  unit: string;
}) {
  if (current == null || start == null || target == null) return null;
  const span = target - start;
  const progress = span === 0 ? 1 : (current - start) / span;
  return <ProgressBar label={label} value={Math.max(0, Math.min(1, progress)) * 100} target={100} unit="%" tone={colors.lime} />;
}

function num(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function labelGoal(goal: Profile['goal_type']) {
  return goal.replace('_', ' ');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 18, paddingBottom: 36 },
  hero: { paddingTop: 8, paddingBottom: 18, gap: 10 },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 34, fontWeight: '900' },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  card: { backgroundColor: colors.card, borderRadius: 8, padding: 16, gap: 16, ...shadow },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { width: '48%', gap: 6 },
  fieldLabel: { color: colors.ink, fontWeight: '800' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    backgroundColor: colors.card
  },
  unit: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  primaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.green
  },
  primaryText: { color: colors.card, fontWeight: '900' }
});
