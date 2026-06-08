export type GoalType = "fat_loss" | "maintenance" | "muscle_gain";
export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

export type FoodKind = "PRODUCT" | "DISH";

export type Food = {
  id: number;
  kind: FoodKind;
  is_seed: number;
  category: string | null;
  name: string;
  name_ua: string | null;
  aliases: string | null;
  aliases_ua: string | null;
  barcode: string | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  low_kcal: number;
  high_kcal: number;
  low_fat: number;
  high_fat: number;
  low_protein: number;
  high_protein: number;
  low_carbs: number;
  high_carbs: number;
};

export type Serving = {
  id: number;
  food_id: number;
  label: string;
  grams: number;
  is_default: number;
};

export type MacroTotals = {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
};

export type Profile = {
  id: 1;
  name: string | null;
  sex: Sex;
  birth_date: string;
  height_cm: number;
  activity_level: ActivityLevel;
  goal_type: GoalType;
  desired_weight_kg: number;
  desired_bicep_cm: number | null;
  desired_chest_cm: number | null;
  desired_waist_cm: number | null;
  desired_leg_both_cm: number | null;
  desired_single_leg_cm: number | null;
  calorie_adjustment_pct: number;
  protein_g_per_kg: number;
  fat_g_per_kg: number;
};

export type BodyRecord = {
  id: number;
  recorded_at: string;
  weight_kg: number | null;
  bicep_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  leg_both_cm: number | null;
  single_leg_cm: number | null;
  photo_uri: string | null;
};

export type LogEntry = {
  id: number;
  log_date: string;
  source_type: "FOOD" | "DISH";
  food_id: number | null;
  custom_dish_id: number | null;
  name: string;
  grams: number | null;
  serving_id: number | null;
  quantity: number | null;
  servings_used: number | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  photo_uri: string | null;
  created_at: string;
};

export type CustomDish = {
  id: number;
  name: string;
  name_ua: string | null;
  photo_uri: string | null;
  servings: number;
  notes: string | null;
  total_kcal: number;
  total_protein_g: number;
  total_fat_g: number;
  total_carbs_g: number;
};
