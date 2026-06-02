import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus, Utensils } from 'lucide-react-native';
import { MacroDatabase, addDishLog, createQuickDish, getCustomDishes, searchFoods } from '../db/database';
import { CustomDish, Food } from '../types';
import { colors, shadow } from '../theme';
import { formatMacro } from '../lib/math';
import { Section } from '../components/Section';
import { saveLocalImage } from '../services/images';

type Props = {
  db: MacroDatabase;
  refreshToken: number;
  onChanged: () => void;
};

export function DishesScreen({ db, refreshToken, onChanged }: Props) {
  const [dishes, setDishes] = useState<CustomDish[]>([]);
  const [selected, setSelected] = useState<CustomDish | null>(null);
  const [servingsUsed, setServingsUsed] = useState('1');
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setDishes(await getCustomDishes(db));
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);

  async function useDish() {
    const amount = Number(servingsUsed);
    if (!selected || !Number.isFinite(amount) || amount <= 0) return;
    await addDishLog(db, selected, amount);
    setSelected(null);
    await refresh();
    onChanged();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Gallery</Text>
          <Text style={styles.title}>Dishes</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setCreating(true)}>
          <Plus size={20} color={colors.card} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {dishes.map((dish) => (
          <Pressable
            key={dish.id}
            style={styles.card}
            onPress={() => {
              setSelected(dish);
              setServingsUsed('1');
            }}
          >
            {dish.photo_uri ? (
              <Image source={{ uri: dish.photo_uri }} style={styles.photo} />
            ) : (
              <View style={styles.photoFallback}>
                <Utensils size={36} color={colors.green} />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{dish.name}</Text>
              <Text style={styles.cardMeta}>{dish.servings} person recipe</Text>
              <Text style={styles.cardMacro}>
                {formatMacro(dish.total_kcal / dish.servings)} kcal · {formatMacro(dish.total_protein_g / dish.servings)}P per person
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <DishModal
        dish={selected}
        servingsUsed={servingsUsed}
        setServingsUsed={setServingsUsed}
        onClose={() => setSelected(null)}
        onUse={useDish}
      />
      <CreateDishModal
        db={db}
        visible={creating}
        onClose={() => setCreating(false)}
        onCreated={async () => {
          setCreating(false);
          await refresh();
        }}
      />
    </ScrollView>
  );
}

function DishModal({
  dish,
  servingsUsed,
  setServingsUsed,
  onClose,
  onUse
}: {
  dish: CustomDish | null;
  servingsUsed: string;
  setServingsUsed: (value: string) => void;
  onClose: () => void;
  onUse: () => void;
}) {
  const used = Number(servingsUsed) || 0;
  const scale = dish ? used / dish.servings : 0;
  return (
    <Modal visible={Boolean(dish)} transparent animationType="slide">
      <View style={styles.modalShade}>
        {dish && (
          <View style={styles.modal}>
            {dish.photo_uri ? <Image source={{ uri: dish.photo_uri }} style={styles.detailPhoto} /> : <View style={styles.detailPhoto} />}
            <Text style={styles.modalTitle}>{dish.name}</Text>
            <View style={styles.macroGrid}>
              <Metric label="Total" value={`${formatMacro(dish.total_kcal)} kcal`} />
              <Metric label="Per person" value={`${formatMacro(dish.total_kcal / dish.servings)} kcal`} />
              <Metric label="Protein used" value={`${formatMacro(dish.total_protein_g * scale)} g`} />
              <Metric label="Carbs used" value={`${formatMacro(dish.total_carbs_g * scale)} g`} />
            </View>
            <TextInput value={servingsUsed} onChangeText={setServingsUsed} keyboardType="decimal-pad" style={styles.input} />
            <Text style={styles.hint}>persons / servings actually used</Text>
            <View style={styles.actions}>
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={onUse}>
                <Text style={styles.primaryText}>Use</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function CreateDishModal({
  db,
  visible,
  onClose,
  onCreated
}: {
  db: MacroDatabase;
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('New dish');
  const [servings, setServings] = useState('2');
  const [query, setQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [ingredients, setIngredients] = useState<{ food: Food; grams: number }[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    searchFoods(db, query).then(setFoods);
  }, [db, query, visible]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });
    if (!result.canceled) setPhotoUri(await saveLocalImage(result.assets[0].uri));
  }

  async function save() {
    const servingCount = Math.max(1, Math.round(Number(servings) || 1));
    if (!name.trim() || ingredients.length === 0) return;
    await createQuickDish(db, name.trim(), servingCount, ingredients, photoUri);
    setIngredients([]);
    setQuery('');
    setPhotoUri(null);
    onCreated();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalShade}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Create dish</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} />
          <TextInput value={servings} onChangeText={setServings} keyboardType="number-pad" style={styles.input} />
          <Pressable style={styles.secondaryButton} onPress={pickPhoto}>
            <Camera size={18} color={colors.ink} />
            <Text style={styles.secondaryText}>Photo</Text>
          </Pressable>
          <TextInput value={query} onChangeText={setQuery} placeholder="Find ingredient" placeholderTextColor={colors.muted} style={styles.input} />
          <ScrollView style={styles.ingredientList}>
            {foods.slice(0, 5).map((food) => (
              <Pressable
                key={food.id}
                style={styles.ingredientRow}
                onPress={() => setIngredients((current) => current.concat({ food, grams: 100 }))}
              >
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.hint}>+100 g</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Section title="Ingredients">
            {ingredients.map((ingredient, index) => (
              <View key={`${ingredient.food.id}-${index}`} style={styles.ingredientRow}>
                <Text style={styles.foodName}>{ingredient.food.name}</Text>
                <TextInput
                  value={String(ingredient.grams)}
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    setIngredients((current) =>
                      current.map((row, rowIndex) => (rowIndex === index ? { ...row, grams: Number(value) || 0 } : row))
                    )
                  }
                  style={styles.smallInput}
                />
              </View>
            ))}
          </Section>
          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={save}>
              <Text style={styles.primaryText}>Save dish</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 18, paddingBottom: 36 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18
  },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 34, fontWeight: '900' },
  addButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.green
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '48%',
    minHeight: 230,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.card,
    ...shadow
  },
  photo: { width: '100%', height: 128, backgroundColor: '#E7DFD0' },
  photoFallback: {
    width: '100%',
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9EDD8'
  },
  cardBody: { padding: 12, gap: 5 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  cardMeta: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  cardMacro: { color: colors.green, fontSize: 13, fontWeight: '900' },
  modalShade: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(23,32,26,0.35)' },
  modal: { maxHeight: '92%', borderRadius: 8, backgroundColor: colors.card, padding: 16, gap: 12 },
  detailPhoto: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#E9EDD8' },
  modalTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48%', padding: 12, borderRadius: 8, backgroundColor: '#EFE7D8' },
  metricValue: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800'
  },
  hint: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.green
  },
  primaryText: { color: colors.card, fontWeight: '900' },
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
  secondaryText: { color: colors.ink, fontWeight: '900' },
  ingredientList: { maxHeight: 170 },
  ingredientRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  foodName: { color: colors.ink, fontWeight: '800' },
  smallInput: {
    width: 74,
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: 'right',
    color: colors.ink,
    fontWeight: '900'
  }
});
