import { describe, expect, it } from 'vitest';
import { computeBmr, computeTargets, computeTdee, defaultCoefficients, macrosForGrams } from '../src/lib/math';
import { Profile } from '../src/types';

const now = new Date('2026-06-02T12:00:00Z');

function profile(overrides: Partial<Profile> = {}): Profile {
  const goal = overrides.goal_type ?? 'fat_loss';
  const coefficients = defaultCoefficients[goal];
  return {
    id: 1,
    name: 'Test',
    sex: 'male',
    birth_date: '1996-06-02',
    height_cm: 180,
    activity_level: 'moderately_active',
    goal_type: goal,
    desired_weight_kg: 75,
    desired_bicep_cm: null,
    desired_chest_cm: null,
    desired_waist_cm: null,
    desired_leg_both_cm: null,
    desired_single_leg_cm: null,
    calorie_adjustment_pct: coefficients.calorieAdjustmentPct,
    protein_g_per_kg: coefficients.proteinGPerKg,
    fat_g_per_kg: coefficients.fatGPerKg,
    ...overrides
  };
}

describe('goal formulas', () => {
  it('computes BMR for male and female profiles', () => {
    expect(computeBmr('male', 80, 180, 30)).toBe(1780);
    expect(computeBmr('female', 60, 165, 28)).toBe(1330);
  });

  it('computes TDEE activity multipliers', () => {
    expect(computeTdee(1780, 'sedentary')).toBe(2136);
    expect(computeTdee(1780, 'lightly_active')).toBe(2448);
    expect(computeTdee(1780, 'moderately_active')).toBe(2759);
    expect(computeTdee(1780, 'very_active')).toBe(3071);
    expect(computeTdee(1780, 'extra_active')).toBe(3382);
  });

  it('computes canonical fat-loss targets', () => {
    expect(computeTargets(profile(), 80, now)).toMatchObject({
      bmr: 1780,
      tdee: 2759,
      kcal: 2207,
      protein_g: 176,
      fat_g: 64,
      carbs_g: 232
    });
  });

  it('clamps below-BMR calorie targets', () => {
    const result = computeTargets(
      profile({
        sex: 'female',
        birth_date: '1981-06-02',
        height_cm: 165,
        activity_level: 'sedentary',
        calorie_adjustment_pct: -0.25
      }),
      60,
      now
    );
    expect(result.bmr).toBe(1245);
    expect(result.tdee).toBe(1494);
    expect(result.kcal).toBe(1245);
  });

  it('recalculates targets when weight changes', () => {
    expect(computeTargets(profile(), 78, now)).toMatchObject({
      bmr: 1760,
      tdee: 2728,
      kcal: 2182,
      protein_g: 172
    });
  });
});

describe('macro logging', () => {
  it('computes logged food macros from grams using 4/4/9 calories', () => {
    const result = macrosForGrams({ kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0 }, 150);
    expect(result.protein_g).toBeCloseTo(46.5);
    expect(result.fat_g).toBeCloseTo(5.4);
    expect(result.carbs_g).toBeCloseTo(0);
    expect(result.kcal).toBeCloseTo(234.6);
  });

  it('rescales macros when grams change', () => {
    const result = macrosForGrams({ kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0 }, 200);
    expect(result.protein_g).toBeCloseTo(62);
    expect(result.kcal).toBeCloseTo(312.8);
  });
});
