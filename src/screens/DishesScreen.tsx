import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { roundHalfUp } from "../domain/rounding";
import type { CustomDish, Food } from "../domain/types";
import { createCustomDish, getCustomDishes, logDish, searchFoods } from "../db/repository";
import { persistLocalImage } from "../utils/localMedia";

export const DishesScreen = ({ onChanged }: { onChanged: () => void }) => {
  const [dishes, setDishes] = useState<CustomDish[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [servings, setServings] = useState("2");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [foodQuery, setFoodQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [ingredients, setIngredients] = useState<Array<{ food: Food; grams: number }>>([]);
  const [useServings, setUseServings] = useState<Record<number, string>>({});

  const refresh = async () => setDishes(await getCustomDishes());

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  useEffect(() => {
    searchFoods(foodQuery).then((rows) => setFoods(rows.slice(0, 8))).catch(console.error);
  }, [foodQuery]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) setPhotoUri(persistLocalImage(uri, "dish"));
  };

  const save = async () => {
    if (!name.trim() || ingredients.length === 0) return;
    await createCustomDish(name.trim(), Number(servings) || 1, ingredients, photoUri);
    setName("");
    setIngredients([]);
    setPhotoUri(undefined);
    setCreating(false);
    await refresh();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Photo-first recipes</Text>
          <Text style={styles.title}>Dishes</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={() => setCreating((value) => !value)}>
          <Ionicons name={creating ? "close-outline" : "add-outline"} size={26} color="#E8EEF8" />
        </Pressable>
      </View>

      {creating ? (
        <View style={styles.form}>
          <TextInput value={name} onChangeText={setName} placeholder="Dish name" style={styles.input} />
          <TextInput value={servings} onChangeText={setServings} placeholder="People served" keyboardType="numeric" style={styles.input} />
          <Pressable style={styles.photoButton} onPress={pickPhoto}>
            <Ionicons name="image-outline" size={20} color="#7FB7FF" />
            <Text style={styles.photoText}>{photoUri ? "Photo attached" : "Add local photo"}</Text>
          </Pressable>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}
          <TextInput value={foodQuery} onChangeText={setFoodQuery} placeholder="Search ingredient" style={styles.input} />
          {foods.map((food) => (
            <Pressable
              key={food.id}
              style={styles.ingredientPick}
              onPress={() => setIngredients((items) => [...items, { food, grams: 100 }])}
            >
              <Text style={styles.cellTitle}>{food.name}</Text>
              <Ionicons name="add-circle-outline" size={22} color="#188A5B" />
            </Pressable>
          ))}
          {ingredients.map((ingredient, index) => (
            <View key={`${ingredient.food.id}-${index}`} style={styles.ingredient}>
              <Text style={styles.cellTitle}>{ingredient.food.name}</Text>
              <TextInput
                value={String(ingredient.grams)}
                onChangeText={(value) =>
                  setIngredients((items) =>
                    items.map((item, itemIndex) => (itemIndex === index ? { ...item, grams: Number(value) || 0 } : item))
                  )
                }
                keyboardType="numeric"
                style={styles.grams}
              />
            </View>
          ))}
          <Pressable style={styles.primary} onPress={save}>
            <Text style={styles.primaryText}>Save dish</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.grid}>
        {dishes.length === 0 ? <Text style={styles.empty}>Create a dish to build your local gallery.</Text> : null}
        {dishes.map((dish) => (
          <View key={dish.id} style={styles.card}>
            {dish.photo_uri ? (
              <Image source={{ uri: dish.photo_uri }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="restaurant-outline" size={32} color="#6B7280" />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{dish.name}</Text>
              <Text style={styles.meta}>
                total {roundHalfUp(dish.total_kcal)} kcal · per person {roundHalfUp(dish.total_kcal / dish.servings)} kcal
              </Text>
              <Text style={styles.meta}>
                P {roundHalfUp(dish.total_protein_g / dish.servings)} C {roundHalfUp(dish.total_carbs_g / dish.servings)} F{" "}
                {roundHalfUp(dish.total_fat_g / dish.servings)}
              </Text>
              <View style={styles.useRow}>
                <TextInput
                  value={useServings[dish.id] ?? "1"}
                  onChangeText={(value) => setUseServings((state) => ({ ...state, [dish.id]: value }))}
                  keyboardType="numeric"
                  style={styles.useInput}
                />
                <Pressable
                  style={styles.useButton}
                  onPress={async () => {
                    await logDish(dish, Number(useServings[dish.id] ?? 1) || 1);
                    onChanged();
                  }}
                >
                  <Text style={styles.useText}>Use</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 18, gap: 18, backgroundColor: "#090F18" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: "#8B96A8", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#F8FAFC", fontSize: 30, fontWeight: "900", letterSpacing: 0 },
  iconButton: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#121A27", borderWidth: 1, borderColor: "#253246", alignItems: "center", justifyContent: "center" },
  form: { gap: 10, padding: 12, borderRadius: 8, backgroundColor: "#111827", borderWidth: 1, borderColor: "#253246" },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#2B374D", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "#0B1220", color: "#F8FAFC" },
  photoButton: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 8, backgroundColor: "#121A27", borderWidth: 1, borderColor: "#253246" },
  photoText: { fontWeight: "800", color: "#D7E7FF" },
  preview: { height: 150, borderRadius: 8, backgroundColor: "#121A27" },
  ingredientPick: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  ingredient: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  grams: { width: 90, minHeight: 40, borderWidth: 1, borderColor: "#2B374D", borderRadius: 8, paddingHorizontal: 10, textAlign: "right", backgroundColor: "#0B1220", color: "#F8FAFC" },
  primary: { minHeight: 46, borderRadius: 8, backgroundColor: "#2388FF", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  grid: { gap: 14 },
  empty: { color: "#8B96A8" },
  card: { overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: "#253246", backgroundColor: "#111827" },
  image: { height: 170, width: "100%", backgroundColor: "#121A27" },
  placeholder: { height: 170, alignItems: "center", justifyContent: "center", backgroundColor: "#121A27" },
  cardBody: { padding: 13, gap: 6 },
  cardTitle: { fontSize: 17, fontWeight: "900", color: "#F8FAFC" },
  cellTitle: { fontSize: 14, fontWeight: "800", color: "#F8FAFC" },
  meta: { color: "#8B96A8", fontSize: 12 },
  useRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  useInput: { width: 70, minHeight: 40, borderWidth: 1, borderColor: "#2B374D", borderRadius: 8, textAlign: "center", backgroundColor: "#0B1220", color: "#F8FAFC" },
  useButton: { flex: 1, borderRadius: 8, backgroundColor: "#2388FF", alignItems: "center", justifyContent: "center" },
  useText: { color: "#FFFFFF", fontWeight: "900" }
});
