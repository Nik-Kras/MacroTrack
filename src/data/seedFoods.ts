import foods from "./foods.seed.json";
import type { Food } from "../domain/types";

export type SeedFood = Food & {
  servings?: Array<{ label: string; grams: number; is_default?: number }>;
};

export const seedFoods = foods as SeedFood[];
