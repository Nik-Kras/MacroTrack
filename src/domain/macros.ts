import type { Food, MacroTotals } from "./types";

export const emptyMacros = (): MacroTotals => ({
  kcal: 0,
  protein_g: 0,
  fat_g: 0,
  carbs_g: 0
});

export const kcalFromMacros = (protein_g: number, fat_g: number, carbs_g: number) =>
  protein_g * 4 + fat_g * 9 + carbs_g * 4;

export const macrosForFoodGrams = (food: Food, grams: number): MacroTotals => {
  const protein_g = (food.protein_g * grams) / 100;
  const fat_g = (food.fat_g * grams) / 100;
  const carbs_g = (food.carbs_g * grams) / 100;
  return {
    kcal: kcalFromMacros(protein_g, fat_g, carbs_g),
    protein_g,
    fat_g,
    carbs_g
  };
};

export const sumMacros = <T extends MacroTotals>(rows: T[]): MacroTotals =>
  rows.reduce(
    (sum, row) => ({
      kcal: sum.kcal + row.kcal,
      protein_g: sum.protein_g + row.protein_g,
      fat_g: sum.fat_g + row.fat_g,
      carbs_g: sum.carbs_g + row.carbs_g
    }),
    emptyMacros()
  );
