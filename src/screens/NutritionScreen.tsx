import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { BarChart3, Plus, Search, Trash2 } from 'lucide-react-native';
import { MacroDatabase, addFoodLog, foodsByFlag, getTodayLog, removeLogEntry, searchFoods, totalsFromLog, updateFoodLogGrams } from '../db/database';
import { computeTargets, formatMacro } from '../lib/math';
import { BodyRecord, Food, LogEntry, Profile } from '../types';
import { colors, shadow } from '../theme';
import { ProgressBar } from '../components/ProgressBar';
import { Section } from '../components/Section';
import { StatPill } from '../components/StatPill';
import { localDateKey } from '../lib/dates';
import { exportDayCsv, exportDayText } from '../services/export';

type Props = {
  db: MacroDatabase;
  profile: Profile;
  latestBody: BodyRecord;
  onOpenStats: () => void;
  refreshToken: number;
  onChanged: () => void;
};

const categories = [
  { label: 'Protein', flag: 'high_protein' as const },
  { label: 'Carbs', flag: 'high_carbs' as const },
  { label: 'Fats', flag: 'high_fat' as const },
  { label: 'Low kcal', flag: 'low_kcal' as const },
  { label: 'High kcal', flag: 'high_kcal' as const }
];

export function NutritionScreen({ db, profile, latestBody, onOpenStats, refreshToken, onChanged }: Props) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('150');
  const [quickEdit, setQuickEdit] = useState<LogEntry | null>(null);

  const latestWeight = latestBody.weight_kg ?? 80;
  const targets = useMemo(() => computeTargets(profile, latestWeight), [profile, latestWeight]);
  const totals = useMemo(() => totalsFromLog(log), [log]);

  const refresh = useCallback(async () => {
    const [nextLog, nextFoods] = await Promise.all([getTodayLog(db), searchFoods(db, query)]);
    setLog(nextLog);
    setFoods(nextFoods);
  }, [db, query]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);

  async function addSelectedFood() {
    const amount = Number(grams);
    if (!selectedFood || !Number.isFinite(amount) || amount <= 0) return;
    await addFoodLog(db, selectedFood, amount);
    setSelectedFood(null);
    setQuery('');
    await refresh();
    onChanged();
  }

  async function saveQuickEdit() {
    const amount = Number(grams);
    if (!quickEdit || !Number.isFinite(amount) || amount <= 0) return;
    await updateFoodLogGrams(db, quickEdit, amount);
    setQuickEdit(null);
    await refresh();
    onChanged();
  }

  async function showCategory(flag: (typeof categories)[number]['flag']) {
    const matches = await foodsByFlag(db, flag);
    setFoods(matches);
    setQuery('');
  }

  async function shareDay() {
    const text = `${exportDayText(localDateKey(), log)}\n\nCSV\n${exportDayCsv(localDateKey(), log)}`;
    await Share.share({ message: text });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Today</Text>
        <Text style={styles.title}>Macro ledger</Text>
        <View style={styles.pills}>
          <StatPill label="Target" value={`${targets.kcal} kcal`} />
          <StatPill label="Left" value={`${Math.round(targets.kcal - totals.kcal)} kcal`} />
          <StatPill label="Weight" value={`${latestWeight} kg`} />
        </View>
      </View>

      <Section title="Daily targets">
        <Pressable style={styles.targetCard} onPress={onOpenStats}>
          <ProgressBar label="Kcal" value={totals.kcal} target={targets.kcal} unit="kcal" tone={colors.green} onPress={onOpenStats} />
          <ProgressBar label="Protein" value={totals.protein_g} target={targets.protein_g} unit="g" tone={colors.coral} onPress={onOpenStats} />
          <ProgressBar label="Carbs" value={totals.carbs_g} target={targets.carbs_g} unit="g" tone={colors.blue} onPress={onOpenStats} />
          <ProgressBar label="Fat" value={totals.fat_g} target={targets.fat_g} unit="g" tone={colors.gold} onPress={onOpenStats} />
        </Pressable>
      </Section>

      <Section title="Add food">
        <View style={styles.searchBox}>
          <Search size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chicken, rice, yogurt..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.categoryRow}>
          {categories.map((category) => (
            <Pressable key={category.flag} style={styles.categoryButton} onPress={() => showCategory(category.flag)}>
              <Text style={styles.categoryText}>{category.label}</Text>
            </Pressable>
          ))}
        </View>
        <FlatList
          data={foods}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              style={styles.foodRow}
              onPress={() => {
                setSelectedFood(item);
                setGrams('150');
              }}
            >
              <View style={styles.foodMain}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodMeta}>{item.category} · per 100 g</Text>
              </View>
              <Text style={styles.foodMacro}>
                {formatMacro(item.protein_g)}P {formatMacro(item.carbs_g)}C {formatMacro(item.fat_g)}F
              </Text>
            </Pressable>
          )}
        />
      </Section>

      <Section title="Today's log">
        {log.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No foods logged for today.</Text>
          </View>
        ) : (
          log.map((entry) => (
            <Pressable
              key={entry.id}
              style={styles.logRow}
              delayLongPress={1000}
              onLongPress={() => {
                setQuickEdit(entry);
                setGrams(String(entry.grams ?? 100));
              }}
            >
              <View style={styles.foodMain}>
                <Text style={styles.foodName}>{entry.name}</Text>
                <Text style={styles.foodMeta}>
                  {entry.source_type === 'FOOD' ? `${entry.grams} g` : `${entry.servings_used} serving`} · {formatMacro(entry.kcal)} kcal
                </Text>
              </View>
              <Pressable
                style={styles.iconButton}
                onPress={() =>
                  Alert.alert('Remove entry?', entry.name, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: async () => {
                        await removeLogEntry(db, entry.id);
                        await refresh();
                        onChanged();
                      }
                    }
                  ])
                }
              >
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            </Pressable>
          ))
        )}
        <View style={styles.actionRow}>
          <Pressable style={styles.primaryButton} onPress={shareDay}>
            <Text style={styles.primaryText}>Export day</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onOpenStats}>
            <BarChart3 size={18} color={colors.ink} />
            <Text style={styles.secondaryText}>Stats</Text>
          </Pressable>
        </View>
      </Section>

      <MacroModal
        title={selectedFood ? `Log ${selectedFood.name}` : quickEdit ? `Edit ${quickEdit.name}` : ''}
        visible={Boolean(selectedFood || quickEdit)}
        grams={grams}
        setGrams={setGrams}
        onCancel={() => {
          setSelectedFood(null);
          setQuickEdit(null);
        }}
        onSave={selectedFood ? addSelectedFood : saveQuickEdit}
        saveLabel={selectedFood ? 'Add' : 'Save'}
      />
    </ScrollView>
  );
}

function MacroModal({
  title,
  visible,
  grams,
  setGrams,
  onCancel,
  onSave,
  saveLabel
}: {
  title: string;
  visible: boolean;
  grams: string;
  setGrams: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalShade}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TextInput keyboardType="decimal-pad" value={grams} onChangeText={setGrams} style={styles.gramsInput} />
          <Text style={styles.modalHint}>grams consumed</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={onCancel}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSave}>
              <Plus size={18} color="#FFFDF8" />
              <Text style={styles.primaryText}>{saveLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper
  },
  content: {
    padding: 18,
    paddingBottom: 36
  },
  hero: {
    paddingTop: 8,
    paddingBottom: 18,
    gap: 10
  },
  eyebrow: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900'
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  targetCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    gap: 16,
    ...shadow
  },
  searchBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.card
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600'
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  categoryButton: {
    borderRadius: 8,
    backgroundColor: '#E9EDD8',
    paddingVertical: 9,
    paddingHorizontal: 11
  },
  categoryText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800'
  },
  foodRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 12
  },
  foodMain: {
    flex: 1,
    gap: 4
  },
  foodName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800'
  },
  foodMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  foodMacro: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '900'
  },
  logRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 12
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F1E4DA'
  },
  empty: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8
  },
  emptyText: {
    color: colors.muted,
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
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
  primaryText: {
    color: colors.card,
    fontWeight: '900'
  },
  secondaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card
  },
  secondaryText: {
    color: colors.ink,
    fontWeight: '900'
  },
  modalShade: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(23,32,26,0.35)'
  },
  modal: {
    borderRadius: 8,
    backgroundColor: colors.card,
    padding: 18,
    gap: 12
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900'
  },
  gramsInput: {
    height: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900'
  },
  modalHint: {
    color: colors.muted,
    fontWeight: '700'
  }
});
