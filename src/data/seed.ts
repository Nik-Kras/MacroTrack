import { colors } from "@/theme";
import type {
  ActivityKey,
  BodyRecord,
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
  { id: 1, name: "Chicken breast", kcal: 120, p: 23, c: 0, f: 2.6, cats: ["protein", "low-cal"], cookable: true, yld: 0.85 },
  { id: 2, name: "Salmon fillet", kcal: 208, p: 20, c: 0, f: 13, cats: ["protein", "fat"], cookable: true, yld: 0.82 },
  { id: 3, name: "Egg", kcal: 143, p: 13, c: 1.1, f: 9.5, cats: ["protein", "fat"] },
  { id: 4, name: "Greek yogurt 0%", kcal: 59, p: 10, c: 3.6, f: 0.4, cats: ["protein", "low-cal"] },
  { id: 5, name: "Tofu", kcal: 76, p: 8, c: 1.9, f: 4.8, cats: ["protein", "low-cal"], cookable: true, yld: 0.9 },
  { id: 6, name: "Lentils", kcal: 352, p: 25, c: 60, f: 1, cats: ["protein", "carbs"], cookable: true, yld: 2.4 },
  { id: 7, name: "Black beans", kcal: 341, p: 21, c: 62, f: 1.4, cats: ["protein", "carbs"], cookable: true, yld: 2.4 },
  { id: 8, name: "Whey protein", kcal: 380, p: 80, c: 8, f: 6, cats: ["protein", "high-cal"] },
  { id: 9, name: "Tuna, canned", kcal: 116, p: 26, c: 0, f: 1, cats: ["protein", "low-cal"] },
  { id: 10, name: "Lean beef", kcal: 187, p: 21, c: 0, f: 11, cats: ["protein", "high-cal"], cookable: true, yld: 0.75 },
  { id: 11, name: "Cottage cheese", kcal: 98, p: 11, c: 3.4, f: 4.3, cats: ["protein", "low-cal"] },
  { id: 12, name: "Oats", kcal: 389, p: 17, c: 66, f: 7, cats: ["carbs", "high-cal"], cookable: true, yld: 2.5 },
  { id: 13, name: "White rice", kcal: 360, p: 7, c: 79, f: 0.6, cats: ["carbs", "high-cal"], cookable: true, yld: 2.5 },
  { id: 14, name: "Brown rice", kcal: 362, p: 7.5, c: 76, f: 2.7, cats: ["carbs", "high-cal"], cookable: true, yld: 2.6 },
  { id: 15, name: "Sweet potato", kcal: 86, p: 1.6, c: 20, f: 0.1, cats: ["carbs", "low-cal"], cookable: true, yld: 0.9 },
  { id: 16, name: "Banana", kcal: 89, p: 1.1, c: 23, f: 0.3, cats: ["carbs", "low-cal"] },
  { id: 17, name: "Quinoa", kcal: 368, p: 14, c: 64, f: 6, cats: ["carbs", "high-cal"], cookable: true, yld: 2.9 },
  { id: 18, name: "Whole wheat bread", kcal: 247, p: 13, c: 41, f: 3.4, cats: ["carbs"] },
  { id: 19, name: "Pasta", kcal: 371, p: 13, c: 75, f: 1.5, cats: ["carbs", "high-cal"], cookable: true, yld: 2.3 },
  { id: 20, name: "Apple", kcal: 52, p: 0.3, c: 14, f: 0.2, cats: ["carbs", "low-cal"] },
  { id: 21, name: "Avocado", kcal: 160, p: 2, c: 9, f: 15, cats: ["fat", "high-cal"] },
  { id: 22, name: "Olive oil", kcal: 884, p: 0, c: 0, f: 100, cats: ["fat", "high-cal"] },
  { id: 23, name: "Almonds", kcal: 579, p: 21, c: 22, f: 49, cats: ["fat", "high-cal"] },
  { id: 24, name: "Peanut butter", kcal: 588, p: 25, c: 20, f: 50, cats: ["fat", "high-cal"] },
  { id: 25, name: "Walnuts", kcal: 654, p: 15, c: 14, f: 65, cats: ["fat", "high-cal"] },
  { id: 26, name: "Chia seeds", kcal: 486, p: 17, c: 42, f: 31, cats: ["fat"] },
  { id: 27, name: "Broccoli", kcal: 34, p: 2.8, c: 7, f: 0.4, cats: ["low-cal"], cookable: true, yld: 0.9 },
  { id: 28, name: "Spinach", kcal: 23, p: 2.9, c: 3.6, f: 0.4, cats: ["low-cal"], cookable: true, yld: 0.35 },
  { id: 29, name: "Cheddar cheese", kcal: 403, p: 25, c: 1.3, f: 33, cats: ["fat", "protein", "high-cal"] },
  { id: 30, name: "Milk 2%", kcal: 50, p: 3.4, c: 5, f: 2, cats: ["protein"] },
];

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

// Body records (oldest → newest), keyed by day offset from base date.
export const BODY_RAW: BodyRecord[] = [
  { d: -120, weight: 82, bicep: 35, chest: 102, waist: 88, leg: 58 },
  { d: -95, weight: 81, bicep: 35, chest: 101.5, waist: 87, leg: 58 },
  { d: -70, weight: 80, bicep: 35.4, chest: 101.5, waist: 86, leg: 58.4 },
  { d: -45, weight: 79.2, bicep: 35.7, chest: 101, waist: 85, leg: 58.8 },
  { d: -20, weight: 78.6, bicep: 35.9, chest: 101, waist: 84.5, leg: 59 },
  { d: -2, weight: 78, bicep: 36, chest: 101, waist: 84, leg: 59 },
];

export const GOALS_BODY = { weight: 72, bicep: 38, chest: 100, waist: 80, leg: 60 } as const;

// Base "today" for the seeded data set.
export const BASE_DATE = new Date(2026, 5, 21);

export const DEFAULT_PROFILE: Profile = {
  name: "Alex",
  sex: "male" as Sex,
  age: 28,
  height: 178,
  weight: 78,
  activity: "moderate",
  goal: "fatloss",
  goalWeight: 72,
};
