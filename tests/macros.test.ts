import { describe, expect, it } from "vitest";
import { macrosForFoodGrams } from "../src/domain/macros";
import type { Food } from "../src/domain/types";

const chicken: Food = {
  id: 1,
  kind: "PRODUCT",
  is_seed: 1,
  category: "PRODUCT",
  name: "Chicken breast",
  name_ua: null,
  aliases: null,
  aliases_ua: null,
  barcode: null,
  kcal: 165,
  protein_g: 31,
  fat_g: 3.6,
  carbs_g: 0,
  low_kcal: 0,
  high_kcal: 0,
  low_fat: 0,
  high_fat: 0,
  low_protein: 0,
  high_protein: 1,
  low_carbs: 1,
  high_carbs: 0
};

describe("macro logging", () => {
  it("computes consumed macros from grams using 4/4/9 kcal", () => {
    const macros = macrosForFoodGrams(chicken, 150);
    expect(macros.protein_g).toBe(46.5);
    expect(macros.fat_g).toBeCloseTo(5.4);
    expect(macros.carbs_g).toBe(0);
    expect(macros.kcal).toBeCloseTo(234.6);
  });
});
