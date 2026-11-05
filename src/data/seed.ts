import { colors } from "@/theme";
import type {
  ActivityKey,
  CategoryKey,
  Dish,
  Food,
  GoalKey,
  Profile,
  Sex,
} from "@/types";

// Macro accent colours (protein / carbs / fat).
export const MC = { p: colors.protein, c: colors.carbs, f: colors.fat } as const;

// Activity multipliers (Mifflin–St Jeor → TDEE).
export const ACT: Record<ActivityKey, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

export const ACTMETA: { key: ActivityKey; label: string; desc: string }[] = [
  { key: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { key: "light", label: "Lightly active", desc: "1–3 days / week" },
  { key: "moderate", label: "Moderately active", desc: "3–5 days / week" },
  { key: "very", label: "Very active", desc: "6–7 days / week" },
  { key: "extra", label: "Extra active", desc: "Hard daily training" },
];

export const GOAL: Record<GoalKey, { adj: number; pkg: number; label: string }> = {
  fatloss: { adj: -0.2, pkg: 2.0, label: "Fat loss" },
  maintain: { adj: 0, pkg: 1.4, label: "Maintenance" },
  gain: { adj: 0.15, pkg: 1.9, label: "Muscle gain" },
};

export const CATMETA: { key: CategoryKey; label: string; color: string }[] = [
  { key: "protein", label: "High protein", color: MC.p },
  { key: "carbs", label: "Good carbs", color: MC.c },
  { key: "fat", label: "Healthy fats", color: MC.f },
  { key: "low-cal", label: "Low calorie", color: colors.lowCal },
  { key: "high-cal", label: "High calorie", color: colors.highCal },
];

export const FOODS: Food[] = [
  { id: 1, name: "Chicken breast", kcal: 120, p: 23, c: 0, f: 2.6, cats: ["protein", "low-cal"], cookable: true, yld: 0.75 },
  { id: 2, name: "Salmon fillet", kcal: 208, p: 20, c: 0, f: 13, cats: ["protein", "fat"], cookable: true, yld: 0.85 },
  { id: 3, name: "Egg", kcal: 143, p: 13, c: 0.7, f: 9.5, cats: ["protein", "fat"] },
  { id: 4, name: "Greek yogurt 0%", kcal: 59, p: 10, c: 3.6, f: 0.4, cats: ["protein", "low-cal"] },
  { id: 5, name: "Tofu", kcal: 76, p: 8, c: 1.9, f: 4.8, cats: ["protein", "low-cal"], cookable: true, yld: 0.9 },
  { id: 6, name: "Lentils", kcal: 352, p: 24.6, c: 63.4, f: 1, cats: ["protein", "carbs"], cookable: true, yld: 3.0 },
  { id: 7, name: "Black beans", kcal: 341, p: 21, c: 62, f: 1.4, cats: ["protein", "carbs"], cookable: true, yld: 2.55 },
  { id: 8, name: "Whey protein", kcal: 380, p: 80, c: 8, f: 6, cats: ["protein", "high-cal"] },
  { id: 9, name: "Tuna, canned", kcal: 85, p: 19.4, c: 0, f: 1, cats: ["protein", "low-cal"] },
  { id: 10, name: "Lean beef", kcal: 187, p: 21, c: 0, f: 11, cats: ["protein", "high-cal"], cookable: true, yld: 0.75 },
  { id: 11, name: "Cottage cheese", kcal: 86, p: 11, c: 4.6, f: 2.3, cats: ["protein", "low-cal"] },
  { id: 12, name: "Oats", kcal: 389, p: 17, c: 66, f: 7, cats: ["carbs", "high-cal"], cookable: true, yld: 5.4 },
  { id: 13, name: "White rice", kcal: 365, p: 7, c: 80, f: 0.6, cats: ["carbs", "high-cal"], cookable: true, yld: 2.8 },
  { id: 14, name: "Brown rice", kcal: 370, p: 7.5, c: 76, f: 2.9, cats: ["carbs", "high-cal"], cookable: true, yld: 2.95 },
  { id: 15, name: "Sweet potato", kcal: 86, p: 1.6, c: 20, f: 0.1, cats: ["carbs", "low-cal"], cookable: true, yld: 0.9 },
  { id: 16, name: "Banana", kcal: 89, p: 1.1, c: 23, f: 0.3, cats: ["carbs", "low-cal"] },
  { id: 17, name: "Quinoa", kcal: 368, p: 14, c: 64, f: 6, cats: ["carbs", "high-cal"], cookable: true, yld: 3.05 },
  { id: 18, name: "Whole wheat bread", kcal: 254, p: 12.3, c: 43.1, f: 3.6, cats: ["carbs"] },
  { id: 19, name: "Pasta", kcal: 371, p: 13, c: 75, f: 1.5, cats: ["carbs", "high-cal"], cookable: true, yld: 2.35 },
  { id: 20, name: "Apple", kcal: 52, p: 0.3, c: 14, f: 0.2, cats: ["carbs", "low-cal"] },
  { id: 21, name: "Avocado", kcal: 160, p: 2, c: 8.5, f: 14.7, cats: ["fat", "high-cal"] },
  { id: 22, name: "Olive oil", kcal: 884, p: 0, c: 0, f: 100, cats: ["fat", "high-cal"] },
  { id: 23, name: "Almonds", kcal: 579, p: 21, c: 22, f: 49, cats: ["fat", "high-cal"] },
  { id: 24, name: "Peanut butter", kcal: 588, p: 25, c: 20, f: 50, cats: ["fat", "high-cal"] },
  { id: 25, name: "Walnuts", kcal: 654, p: 15, c: 14, f: 65, cats: ["fat", "high-cal"] },
  { id: 26, name: "Chia seeds", kcal: 486, p: 16.5, c: 42, f: 30.7, cats: ["fat"] },
  { id: 27, name: "Broccoli", kcal: 34, p: 2.8, c: 6.6, f: 0.4, cats: ["low-cal"], cookable: true, yld: 1.05 },
  { id: 28, name: "Spinach", kcal: 23, p: 2.9, c: 3.6, f: 0.4, cats: ["low-cal"], cookable: true, yld: 0.85 },
  { id: 29, name: "Cheddar cheese", kcal: 403, p: 22.9, c: 3.4, f: 33.3, cats: ["fat", "protein", "high-cal"] },
  { id: 30, name: "Milk 2%", kcal: 50, p: 3.4, c: 4.9, f: 2, cats: ["protein"] },
];

/**
 * Cooking yields (cooked g per uncooked g) shipped before 1.3.0, for the built-in foods whose yield was corrected
 * in 1.3.0 against USDA Cooking Yields (2014), USDA SR Legacy raw/cooked pairs and Bognár (2002). Chicken breast
 * was 0.85 (≈ 0.75), dry pasta 2.3 (2.35), white rice 2.5 (2.8), oats 2.5 (porridge with water ≈ 5.4), spinach
 * 0.35 (boiled or wilted ≈ 0.85). Lentils use 3.0, the calorie ratio of dry to cooked, since some solids stay in the water.
 */
const OLD_YLD: Record<number, number> = { 1: 0.85, 2: 0.82, 6: 2.4, 7: 2.4, 12: 2.5, 13: 2.5, 14: 2.6, 17: 2.9, 19: 2.3, 27: 0.9, 28: 0.35 };

/**
 * Brings saved built-in foods up to the current yields. Foods are stored with the user's data, so new seed values
 * don't reach existing installs or restored backups on their own; a yield the user changed is left alone.
 */
export function refreshSeedYields(foods: Food[]): Food[] {
  const seed = new Map(FOODS.map((f) => [f.id, f]));
  return foods.map((f) => {
    if (f.custom || typeof f.id !== "number") return f;
    const s = seed.get(f.id);
    const old = OLD_YLD[f.id];
    if (!s?.yld || old === undefined || f.yld !== old) return f;
    return { ...f, yld: s.yld };
  });
}

export const DISHRAW: Dish[] = [
  { id: "d1", name: "Chicken & Rice Bowl", servings: 2, glyph: "🍗", ing: [[1, 350], [13, 100], [27, 200], [22, 12]] },
  { id: "d2", name: "Salmon Poke", servings: 2, glyph: "🐟", ing: [[2, 280], [14, 90], [21, 100], [28, 60]] },
  { id: "d3", name: "Protein Oats", servings: 1, glyph: "🥣", ing: [[12, 80], [8, 30], [16, 100], [24, 15]] },
  { id: "d4", name: "Beef Burrito Bowl", servings: 2, glyph: "🌯", ing: [[10, 350], [7, 80], [13, 90], [21, 80]] },
  { id: "d5", name: "Yogurt Parfait", servings: 1, glyph: "🥛", ing: [[4, 200], [12, 30], [23, 20], [16, 80]] },
  { id: "d6", name: "Tofu Stir-fry", servings: 2, glyph: "🥦", ing: [[5, 350], [14, 80], [27, 200], [22, 12]] },
];

export const GLYPHMAP: Record<number, string> = {
  1: "🍗", 2: "🐟", 3: "🥚", 4: "🥛", 5: "🧈", 6: "🫘", 7: "🫘", 8: "💪", 9: "🐟", 10: "🥩",
  11: "🧀", 12: "🥣", 13: "🍚", 14: "🍚", 15: "🍠", 16: "🍌", 17: "🌾", 18: "🍞", 19: "🍝", 20: "🍎",
  21: "🥑", 22: "🫒", 23: "🌰", 24: "🥜", 25: "🌰", 26: "🌱", 27: "🥦", 28: "🥬", 29: "🧀", 30: "🥛",
};

export const EMOJIS = [
  "🍗", "🥩", "🐟", "🍤", "🥚", "🥛", "🧀", "🧈", "🫘", "🍚", "🍞", "🍝", "🥔", "🍠", "🌽", "🥦",
  "🥬", "🥗", "🥑", "🍌", "🍎", "🫐", "🍓", "🥜", "🌰", "🫒", "🍪", "🍫", "☕", "🥣", "🍲", "🌯",
];

// "Today" anchor for relative day math — the real current date (local midnight).
export const BASE_DATE = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

// Neutral starting profile — no personal data until the user fills it in.
export const DEFAULT_PROFILE: Profile = {
  name: "",
  sex: "male" as Sex,
  age: 25,
  height: 175,
  weight: 70,
  activity: "moderate",
  goal: "maintain",
  goalWeight: 70,
};
