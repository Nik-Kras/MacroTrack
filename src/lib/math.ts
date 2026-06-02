import { ActivityLevel, GoalType, MacroTotals, Profile, Sex } from '../types';

export const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9
};

export const defaultCoefficients: Record<
  GoalType,
  { calorieAdjustmentPct: number; proteinGPerKg: number; fatGPerKg: number }
> = {
  fat_loss: { calorieAdjustmentPct: -0.2, proteinGPerKg: 2.2, fatGPerKg: 0.8 },
  maintenance: { calorieAdjustmentPct: 0, proteinGPerKg: 1.4, fatGPerKg: 0.8 },
  muscle_gain: { calorieAdjustmentPct: 0.15, proteinGPerKg: 1.8, fatGPerKg: 0.8 }
};

export function ageFromBirthDate(birthDate: string, now = new Date()): number {
  const born = new Date(`${birthDate}T00:00:00`);
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

export function computeBmr(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return roundHalfUp(sex === 'male' ? base + 5 : base - 161);
}

export function computeTdee(bmr: number, activityLevel: ActivityLevel): number {
  return roundHalfUp(bmr * activityMultipliers[activityLevel]);
}

export function computeTargets(profile: Profile, latestWeightKg: number, now = new Date()) {
  const age = ageFromBirthDate(profile.birth_date, now);
  const bmr = computeBmr(profile.sex, latestWeightKg, profile.height_cm, age);
  const tdee = computeTdee(bmr, profile.activity_level);
  const practicalMinimum = profile.sex === 'female' ? 1200 : 1500;
  const calorieTarget = roundHalfUp(
    Math.max(tdee * (1 + profile.calorie_adjustment_pct), bmr, practicalMinimum)
  );
  const protein = roundHalfUp(profile.protein_g_per_kg * latestWeightKg);
  const rawFat = profile.fat_g_per_kg * latestWeightKg;
  const fatFloor = Math.max((calorieTarget * 0.2) / 9, 0.5 * latestWeightKg);
  const fatCap = (calorieTarget * 0.35) / 9;
  const fat = roundHalfUp(Math.min(Math.max(rawFat, fatFloor), fatCap));
  const carbs = Math.max(0, roundHalfUp((calorieTarget - protein * 4 - fat * 9) / 4));

  return {
    bmr,
    tdee,
    kcal: calorieTarget,
    protein_g: protein,
    fat_g: fat,
    carbs_g: carbs
  };
}

export function macrosForGrams(food: MacroTotals, grams: number): MacroTotals {
  const scale = grams / 100;
  const protein_g = food.protein_g * scale;
  const carbs_g = food.carbs_g * scale;
  const fat_g = food.fat_g * scale;
  return {
    protein_g,
    carbs_g,
    fat_g,
    kcal: protein_g * 4 + carbs_g * 4 + fat_g * 9
  };
}

export function addMacros(items: MacroTotals[]): MacroTotals {
  return items.reduce(
    (total, item) => ({
      kcal: total.kcal + item.kcal,
      protein_g: total.protein_g + item.protein_g,
      carbs_g: total.carbs_g + item.carbs_g,
      fat_g: total.fat_g + item.fat_g
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

export function formatMacro(value: number): string {
  return String(roundHalfUp(value));
}
