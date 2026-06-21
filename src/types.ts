export type CategoryKey = "protein" | "carbs" | "fat" | "low-cal" | "high-cal";
export type Sex = "male" | "female";
export type ActivityKey = "sedentary" | "light" | "moderate" | "very" | "extra";
export type GoalKey = "fatloss" | "maintain" | "gain";
export type CookMode = "raw" | "cooked" | "na";

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
}

export interface Dish {
  id: string;
  name: string;
  servings: number;
  glyph?: string;
  emoji?: string;
  photo?: string;
  /** [foodId, grams] pairs */
  ing: [number | string, number][];
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
}

export interface BodyRecord {
  /** day offset from base date (negative = past) */
  d: number;
  weight: number;
  bicep: number;
  chest: number;
  waist: number;
  leg: number;
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
