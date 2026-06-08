import { roundHalfUp } from "./rounding";
import type { ActivityLevel, GoalType, MacroTotals, Profile, Sex } from "./types";

export const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9
};

export const goalDefaults: Record<
  GoalType,
  { calorieAdjustmentPct: number; proteinGPerKg: number; fatGPerKg: number }
> = {
  fat_loss: { calorieAdjustmentPct: -0.2, proteinGPerKg: 2.2, fatGPerKg: 0.8 },
  maintenance: { calorieAdjustmentPct: 0, proteinGPerKg: 1.4, fatGPerKg: 0.8 },
  muscle_gain: { calorieAdjustmentPct: 0.15, proteinGPerKg: 1.8, fatGPerKg: 0.8 }
};

export const ageFromBirthDate = (birthDate: string, today = new Date()) => {
  const born = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
};

export const calculateBmr = (sex: Sex, weightKg: number, heightCm: number, ageYears: number) => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
};

export const calculateTdee = (bmr: number, activityLevel: ActivityLevel) =>
  bmr * activityMultipliers[activityLevel];

export const calculateTargets = (
  profile: Profile,
  currentWeightKg: number,
  today = new Date()
): MacroTotals & { bmr: number; tdee: number } => {
  const age = ageFromBirthDate(profile.birth_date, today);
  const bmr = calculateBmr(profile.sex, currentWeightKg, profile.height_cm, age);
  const tdee = calculateTdee(bmr, profile.activity_level);
  const practicalMinimum = profile.sex === "female" ? 1200 : 1500;
  const kcal = Math.max(tdee * (1 + profile.calorie_adjustment_pct), bmr, practicalMinimum);
  const protein_g = profile.protein_g_per_kg * currentWeightKg;
  const rawFat = profile.fat_g_per_kg * currentWeightKg;
  const fatFloor = Math.max((kcal * 0.2) / 9, 0.5 * currentWeightKg);
  const fatCap = (kcal * 0.35) / 9;
  const fat_g = Math.min(Math.max(rawFat, fatFloor), fatCap);
  const carbs_g = Math.max((kcal - protein_g * 4 - fat_g * 9) / 4, 0);

  return {
    bmr: roundHalfUp(bmr),
    tdee: roundHalfUp(tdee),
    kcal: roundHalfUp(kcal),
    protein_g: roundHalfUp(protein_g),
    fat_g: roundHalfUp(fat_g),
    carbs_g: roundHalfUp(carbs_g)
  };
};

export const defaultProfile = (): Profile => ({
  id: 1,
  name: "MacroTrack",
  sex: "male",
  birth_date: "1996-06-08",
  height_cm: 180,
  activity_level: "moderately_active",
  goal_type: "fat_loss",
  desired_weight_kg: 75,
  desired_bicep_cm: null,
  desired_chest_cm: null,
  desired_waist_cm: 80,
  desired_leg_both_cm: null,
  desired_single_leg_cm: null,
  ...{
    calorie_adjustment_pct: goalDefaults.fat_loss.calorieAdjustmentPct,
    protein_g_per_kg: goalDefaults.fat_loss.proteinGPerKg,
    fat_g_per_kg: goalDefaults.fat_loss.fatGPerKg
  }
});
