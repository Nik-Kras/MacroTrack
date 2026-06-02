import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Download } from 'lucide-react-native';
import { MacroDatabase, getBodyRecords, getMacroHistory } from '../db/database';
import { computeTargets, formatMacro } from '../lib/math';
import { BodyRecord, MacroTotals, Profile } from '../types';
import { colors, shadow } from '../theme';
import { MiniChart } from '../components/MiniChart';
import { Section } from '../components/Section';
import { StatPill } from '../components/StatPill';
import { exportSummaryCsv } from '../services/export';

type Span = 'day' | 'week' | 'month' | 'all';

type Props = {
  db: MacroDatabase;
  profile: Profile;
  latestBody: BodyRecord;
  refreshToken: number;
};

export function StatsScreen({ db, profile, latestBody, refreshToken }: Props) {
  const [span, setSpan] = useState<Span>('week');
  const [macroRows, setMacroRows] = useState<(MacroTotals & { log_date: string })[]>([]);
  const [bodyRows, setBodyRows] = useState<BodyRecord[]>([]);
  const targets = useMemo(() => computeTargets(profile, latestBody.weight_kg ?? 80), [profile, latestBody.weight_kg]);

  const refresh = useCallback(async () => {
    const [macros, body] = await Promise.all([getMacroHistory(db), getBodyRecords(db)]);
    setMacroRows(macros);
    setBodyRows(body);
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);

  const filteredMacros = useMemo(() => filterBySpan(macroRows, span), [macroRows, span]);
  const total = useMemo(
    () =>
      filteredMacros.reduce(
        (acc, row) => ({
          kcal: acc.kcal + row.kcal,
          protein_g: acc.protein_g + row.protein_g,
          carbs_g: acc.carbs_g + row.carbs_g,
          fat_g: acc.fat_g + row.fat_g
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      ),
    [filteredMacros]
  );
  const targetForSpan = targets.kcal * Math.max(1, filteredMacros.length || (span === 'day' ? 1 : 0));
  const delta = total.kcal - targetForSpan;

  async function shareSummary() {
    await Share.share({ message: exportSummaryCsv(filteredMacros) });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Trends</Text>
        <Text style={styles.title}>Statistics</Text>
        <View style={styles.pills}>
          <StatPill label="Intake" value={`${formatMacro(total.kcal)}`} />
          <StatPill label={delta >= 0 ? 'Surplus' : 'Deficit'} value={`${formatMacro(delta)}`} />
          <StatPill label="Days" value={`${filteredMacros.length}`} />
        </View>
      </View>

      <View style={styles.segment}>
        {(['day', 'week', 'month', 'all'] as Span[]).map((item) => (
          <Pressable key={item} style={[styles.segmentButton, span === item && styles.segmentActive]} onPress={() => setSpan(item)}>
            <Text style={[styles.segmentText, span === item && styles.segmentTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Section title="Macro trend">
        <View style={styles.card}>
          <MiniChart values={filteredMacros.map((row) => row.kcal)} color={colors.green} emptyLabel="No intake in this span" />
          <View style={styles.legend}>
            <Text style={styles.legendText}>{formatMacro(total.protein_g)} g protein</Text>
            <Text style={styles.legendText}>{formatMacro(total.carbs_g)} g carbs</Text>
            <Text style={styles.legendText}>{formatMacro(total.fat_g)} g fat</Text>
          </View>
        </View>
      </Section>

      <Section title="Body trend">
        <View style={styles.card}>
          <MiniChart values={bodyRows.map((record) => record.weight_kg ?? NaN)} color={colors.coral} emptyLabel="No body records yet" />
        </View>
      </Section>

      <Pressable style={styles.primaryButton} onPress={shareSummary}>
        <Download size={18} color={colors.card} />
        <Text style={styles.primaryText}>Export summary CSV</Text>
      </Pressable>
    </ScrollView>
  );
}

function filterBySpan<T extends { log_date: string }>(rows: T[], span: Span) {
  if (span === 'all') return rows;
  const days = span === 'day' ? 1 : span === 'week' ? 7 : 31;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  const key = cutoff.toISOString().slice(0, 10);
  return rows.filter((row) => row.log_date >= key);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 18, paddingBottom: 36 },
  hero: { paddingTop: 8, paddingBottom: 18, gap: 10 },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 34, fontWeight: '900' },
  pills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#E7DFD0',
    marginBottom: 22
  },
  segmentButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { color: colors.muted, fontWeight: '900', textTransform: 'capitalize' },
  segmentTextActive: { color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: 8, padding: 16, gap: 12, ...shadow },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendText: { color: colors.muted, fontWeight: '800' },
  primaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.green
  },
  primaryText: { color: colors.card, fontWeight: '900' }
});
