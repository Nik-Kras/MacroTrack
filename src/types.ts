export type CategoryKey = "protein" | "carbs" | "fat" | "low-cal" | "high-cal";
export type Sex = "male" | "female";
export type ActivityKey = "sedentary" | "light" | "moderate" | "very" | "extra";
export type GoalKey = "fatloss" | "maintain" | "gain";
export type CookMode = "raw" | "cooked" | "na";

/** Energy and macros: kcal, protein, carbs, fat (g). */
export interface Macros {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

export interface Food {
  id: number | string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  cats: CategoryKey[];
  cookable?: boolean;
  /** yield factor: cooked grams per uncooked gram */
  yld?: number;
  emoji?: string;
  photo?: string;
  custom?: boolean;
  /** Custom quick amounts (uncooked grams, optionally named — "1 slice" = 35 g).
   *  When set, these replace the default 50/100/… presets in the grams sheet. */
  presets?: FoodPreset[];
  /** Weight of one item, g (an egg ≈ 55 g, a bar 45 g): the food can be logged in pieces as well as grams. */
  pieceG?: number;
  /**
   * The values for one item, when the food was entered per item (a sandwich, a slice of pizza).
   * kcal/p/c/f then hold the per-100 g values worked out with pieceG; without pieceG they are 0
   * and the food is counted in pieces only (not offered for dishes or meal photos).
   */
  item?: Macros;
  /** How it was last logged, so the amount sheet opens the same way next time. */
  unit?: "g" | "pcs";
}

export interface FoodPreset {
  g: number;
  name?: string;
}

export interface Dish {
  id: string;
  name: string;
  servings: number;
  glyph?: string;
  emoji?: string;
  photo?: string;
  /** [foodId, rawGrams] pairs */
  ing: [number | string, number][];
  /**
   * Total weight of the finished, cooked dish (grams), as measured by the user.
   * Used to log a portion by cooked weight. When unset, a value is predicted
   * from each ingredient's yield (Σ rawGrams × yield).
   */
  cookedWeight?: number;
  custom?: boolean;
}

export interface LogEntry {
  id: string;
  kind: "food" | "dish";
  foodId?: number | string;
  dishId?: string;
  name: string;
  grams: number;
  mode: CookMode;
  kcal: number;
  p: number;
  c: number;
  f: number;
  cat: string;
  /** Logged by count: how many pieces. grams = pieces × the item weight (0 when it isn't known). */
  pieces?: number;
  /** Epoch ms, set only for entries logged to the live day; back-filled and
   *  legacy entries have none and are never grouped into meals. */
  at?: number;
}

export type MetricKey = "weight" | "waist" | "bicep" | "chest" | "leg";

export interface Measurement {
  id: string;
  metric: MetricKey;
  value: number;
  /** ISO calendar date (YYYY-MM-DD) the measurement was logged for */
  date: string;
}

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  height: number;
  weight: number;
  activity: ActivityKey;
  goal: GoalKey;
  goalWeight: number;
  /** local file:// URI of the profile photo (optional) */
  photo?: string;
}

export interface Targets {
  bmr: number;
  tdee: number;
  cal: number;
  p: number;
  c: number;
  f: number;
}

export type LogMap = Record<string, LogEntry[]>;
