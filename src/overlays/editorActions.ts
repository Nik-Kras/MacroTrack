import type { FoodDraft, OverlayKey } from "@/store/store";
import type { Dish, Food, FoodPreset } from "@/types";

interface StoreLike {
  state: { foods: Food[]; dishes: Dish[]; ov: OverlayKey | null; searchMode: "log" | "dish"; dishDraft: any; foodDraft: FoodDraft | null };
  patch: (p: any) => void;
}

let seq = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function openFoodEditor(store: StoreLike, food: Food | null) {
  const d: FoodDraft = food
    ? {
        id: food.id,
        name: food.name,
        p: food.p,
        c: food.c,
        f: food.f,
        kcal: food.kcal,
        // Preserve an explicit (measured) calorie value: when the stored kcal doesn't
        // match the Atwater estimate (4·P + 4·C + 9·F), open in manual mode so a save
        // can't silently overwrite it. Atwater-consistent foods stay in auto mode.
        kcalManual: Math.round((food.p || 0) * 4 + (food.c || 0) * 4 + (food.f || 0) * 9) !== food.kcal,
        emoji: food.emoji || "",
        photo: food.photo || "",
        cats: [...(food.cats || [])],
        custom: !!food.custom,
        cookable: !!food.cookable,
        yld: food.yld || 2,
        presets: (food.presets || []).map((p) => ({ g: String(p.g), name: p.name || "" })),
      }
    : {
        id: null,
        name: "",
        p: "",
        c: "",
        f: "",
        kcal: 0,
        kcalManual: false,
        emoji: "",
        photo: "",
        cats: [],
        custom: true,
        cookable: false,
        yld: 2,
        presets: [],
      };
  d.fromDish = store.state.ov === "addFood" && store.state.searchMode === "dish";
  store.patch({ ov: "foodEdit", foodDraft: d });
}

/** Persist the current foodDraft; returns the saved Food. */
export function saveFood(store: StoreLike): Food {
  const d = store.state.foodDraft!;
  const kcal = d.kcalManual
    ? Math.round(+d.kcal || 0)
    : Math.round((+d.p || 0) * 4 + (+d.c || 0) * 4 + (+d.f || 0) * 9);
  const presets = (d.presets || [])
    .map((p) => ({ g: Math.round(parseFloat(p.g)) || 0, name: p.name.trim() }))
    .filter((p) => p.g > 0)
    .map((p): FoodPreset => (p.name ? p : { g: p.g }));
  const base = {
    name: (d.name || "").trim() || "Custom food",
    kcal,
    p: +d.p || 0,
    c: +d.c || 0,
    f: +d.f || 0,
    cats: d.cats || [],
    emoji: d.emoji || "",
    photo: d.photo || "",
    cookable: !!d.cookable,
    yld: d.cookable ? parseFloat(String(d.yld)) || 1 : undefined,
    presets: presets.length ? presets : undefined,
  };
  const foods = store.state.foods;
  const idx = foods.findIndex((x) => x.id === d.id);
  if (idx >= 0) {
    const updated = { ...foods[idx], ...base };
    const next = foods.slice();
    next[idx] = updated;
    store.patch({ foods: next });
    return updated;
  }
  const food: Food = { id: uid("u"), custom: true, ...base };
  store.patch({ foods: [...foods, food] });
  return food;
}

export function deleteFood(store: StoreLike, id: number | string) {
  store.patch({ foods: store.state.foods.filter((x) => x.id !== id) });
}

export function saveDish(store: StoreLike) {
  const d = store.state.dishDraft;
  const ing = (d.ing || [])
    .filter((i: any) => i.grams > 0)
    .map((i: any) => [i.foodId, i.grams] as [number | string, number]);
  const cookedWeight = parseFloat(String(d.cookedWeight));
  const base = {
    name: (d.name || "").trim() || "New dish",
    servings: Math.max(1, d.servings || 1),
    glyph: d.emoji || "🍽",
    emoji: d.emoji || "",
    photo: d.photo || "",
    ing,
    cookedWeight: cookedWeight > 0 ? Math.round(cookedWeight) : undefined,
  };
  const dishes = store.state.dishes;
  const idx = dishes.findIndex((x) => x.id === d.id);
  if (idx >= 0) {
    const next = dishes.slice();
    next[idx] = { ...dishes[idx], ...base };
    store.patch({ dishes: next });
  } else {
    store.patch({ dishes: [...dishes, { id: uid("d"), custom: true, ...base }] });
  }
}

export function deleteDish(store: StoreLike, id: string) {
  store.patch({ dishes: store.state.dishes.filter((x) => x.id !== id) });
}

export { uid };
