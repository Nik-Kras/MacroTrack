export type GoalType = 'fat_loss' | 'maintenance' | 'muscle_gain';
export type Sex = 'male' | 'female';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type MacroTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Food = MacroTotals & {
  id: number;
  kind: 'PRODUCT' | 'DISH';
  is_seed: number;
  category: string | null;
  name: string;
  name_ua: string | null;
  aliases: string | null;
  aliases_ua: string | null;
  low_kcal: number;
  high_kcal: number;
  low_fat: number;
  high_fat: number;
  low_protein: number;
  high_protein: number;
  low_carbs: number;
  high_carbs: number;
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
};

export type LogEntry = MacroTotals & {
  id: number;
  log_date: string;
  source_type: 'FOOD' | 'DISH';
  food_id: number | null;
  custom_dish_id: number | null;
  grams: number | null;
  servings_used: number | null;
  photo_uri: string | null;
  name: string;
};

export type CustomDish = {
  id: number;
  name: string;
  photo_uri: string | null;
  servings: number;
  notes: string | null;
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
};
