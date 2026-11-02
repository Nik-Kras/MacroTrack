import { describe, expect, it } from "vitest";
import { calculateBmr, calculateTargets, calculateTdee, defaultProfile } from "../src/domain/targets";

describe("goal target formulas", () => {
  it("calculates Mifflin-St Jeor BMR for male and female profiles", () => {
    expect(calculateBmr("male", 80, 180, 30)).toBe(1780);
    expect(calculateBmr("female", 60, 165, 28)).toBeCloseTo(1330.25);
  });

  it("uses documented activity multipliers", () => {
    expect(Math.round(calculateTdee(1780, "sedentary"))).toBe(2136);
    expect(Math.round(calculateTdee(1780, "lightly_active"))).toBe(2448);
    expect(Math.round(calculateTdee(1780, "moderately_active"))).toBe(2759);
    expect(Math.round(calculateTdee(1780, "very_active"))).toBe(3071);
    expect(Math.round(calculateTdee(1780, "extra_active"))).toBe(3382);
  });

  it("derives canonical fat-loss macro targets", () => {
    const profile = { ...defaultProfile(), birth_date: "1996-06-08" };
    const targets = calculateTargets(profile, 80, new Date("2026-06-08T12:00:00"));
    expect(targets.bmr).toBe(1780);
    expect(targets.tdee).toBe(2759);
    expect(targets.kcal).toBe(2207);
    expect(targets.protein_g).toBe(176);
    expect(targets.fat_g).toBe(64);
    expect(targets.carbs_g).toBe(232);
  });

  it("clamps below-floor calorie targets and fat minimums", () => {
    const profile = {
      ...defaultProfile(),
      sex: "female" as const,
      birth_date: "1981-06-08",
      height_cm: 165,
      activity_level: "sedentary" as const,
      calorie_adjustment_pct: -0.25,
      fat_g_per_kg: 0.5
    };
    const targets = calculateTargets(profile, 60, new Date("2026-06-08T12:00:00"));
    expect(targets.kcal).toBe(1245);
    expect(targets.fat_g).toBe(30);
  });
});
