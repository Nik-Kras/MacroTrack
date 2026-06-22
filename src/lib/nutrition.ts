import {
  ACT,
  BASE_DATE,
  CATMETA,
  DISHRAW,
  GLYPHMAP,
  GOAL,
} from "@/data/seed";
import type {
  CookMode,
  Dish,
  Food,
  LogEntry,
  Profile,
  Targets,
} from "@/types";

export const round = (n: number) => Math.round(n);

// ---- food / dish lookup ----
export const findFood = (
  foods: Food[],
  id: number | string | undefined,
): Food | undefined => foods.find((x) => x.id === id);

export const findDish = (
  dishes: Dish[],
  id: string | undefined,
): Dish | undefined => dishes.find((x) => x.id === id);

export const isCookable = (food?: Food) => !!(food && food.cookable);
export const yldOf = (food?: Food) => (food && food.yld) || 1;
export const toCooked = (food: Food, gUncooked: number) => gUncooked * yldOf(food);
export const toUncooked = (food: Food, gCooked: number) => gCooked / yldOf(food);

export function weightLabel(food: Food | undefined, gUncooked: number, mode: CookMode) {
  if (!isCookable(food)) return `${gUncooked} g`;
  if (mode === "cooked") return `${Math.round(toCooked(food!, gUncooked))} g cooked`;
  return `${gUncooked} g raw`;
}

// ---- dates (offset from BASE_DATE) ----
export function fmtKey(d: Date) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
export function dayKey(off: number) {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + off);
  return fmtKey(d);
}
export function dateForOffset(off: number) {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + off);
  return d;
}
export function offsetForKey(key: string) {
  const [y, m, dd] = key.split("-").map(Number);
  const d = new Date(y, m - 1, dd);
  const b = new Date(BASE_DATE);
  b.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - b.getTime()) / 86400000);
}

// ---- macro math ----
export function logFromFood(food: Food, grams: number, mode?: CookMode): LogEntry {
  const r = grams / 100;
  return {
    id: "l" + Math.random().toString(36).slice(2, 8),
    kind: "food",
    foodId: food.id,
    name: food.name,
    grams,
    mode: food.cookable ? mode || "raw" : "na",
    kcal: round(food.kcal * r),
    p: +(food.p * r).toFixed(1),
    c: +(food.c * r).toFixed(1),
    f: +(food.f * r).toFixed(1),
    cat: food.cats[0],
  };
}

export function dishMacros(d: Dish, foods: Food[]) {
  let k = 0, p = 0, c = 0, f = 0, g = 0, cooked = 0;
  d.ing.forEach(([id, gr]) => {
    const fo = findFood(foods, id);
    if (!fo) return;
    const r = gr / 100;
    k += fo.kcal * r; p += fo.p * r; c += fo.c * r; f += fo.f * r; g += gr;
    cooked += gr * yldOf(fo); // predicted cooked weight from per-ingredient yields
  });
  const sv = Math.max(1, d.servings || 1);
  return {
    kcal: k, p, c, f,
    grams: g, // total raw weight
    cooked, // predicted total cooked weight (Σ rawGrams × yield)
    perKcal: k / sv, perP: p / sv, perC: c / sv, perF: f / sv,
  };
}

/**
 * The dish's total cooked weight: the user-measured override when set (> 0),
 * otherwise the value predicted from ingredient yields. Pass `m.cooked` from
 * dishMacros as the predicted fallback.
 */
export function effectiveCookedWeight(override: number | undefined, predicted: number) {
  return override && override > 0 ? override : predicted;
}

/** Scale a dish's total macros to the portion implied by `grams` of `cookedTotal`. */
export function macrosForCookedGrams(
  m: { kcal: number; p: number; c: number; f: number },
  cookedTotal: number,
  grams: number,
) {
  const factor = cookedTotal > 0 ? grams / cookedTotal : 0;
  return {
    kcal: m.kcal * factor,
    p: m.p * factor,
    c: m.c * factor,
    f: m.f * factor,
  };
}

/**
 * Live macros for a log entry, recomputed from the *current* food/dish definition
 * so that editing an ingredient (or a dish recipe) propagates to portions already
 * logged — entries are not frozen snapshots. The macros stored on the entry are
 * used only as a fallback when its source food/dish no longer exists (e.g. deleted).
 */
export function entryMacros(
  e: LogEntry,
  foods: Food[],
  dishes: Dish[],
): { kcal: number; p: number; c: number; f: number } {
  const snapshot = { kcal: e.kcal, p: e.p, c: e.c, f: e.f };
  if (e.kind === "food") {
    const fo = findFood(foods, e.foodId);
    if (!fo) return snapshot;
    const r = e.grams / 100;
    return {
      kcal: round(fo.kcal * r),
      p: +(fo.p * r).toFixed(1),
      c: +(fo.c * r).toFixed(1),
      f: +(fo.f * r).toFixed(1),
    };
  }
  const d = findDish(dishes, e.dishId);
  if (!d) return snapshot;
  const m = dishMacros(d, foods);
  if (e.mode === "cooked") {
    // Logged by cooked weight: scale total macros to e.grams of the cooked total.
    const cookedTotal = Math.round(effectiveCookedWeight(d.cookedWeight, m.cooked));
    const s = macrosForCookedGrams(m, cookedTotal, e.grams);
    return { kcal: round(s.kcal), p: +s.p.toFixed(1), c: +s.c.toFixed(1), f: +s.f.toFixed(1) };
  }
  // Logged by servings: e.grams is raw grams, so scale by the raw-weight fraction.
  const factor = m.grams > 0 ? e.grams / m.grams : 0;
  return {
    kcal: round(m.kcal * factor),
    p: +(m.p * factor).toFixed(1),
    c: +(m.c * factor).toFixed(1),
    f: +(m.f * factor).toFixed(1),
  };
}

export function computeTargets(p: Profile): Targets {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const tdee = bmr * ACT[p.activity];
  const g = GOAL[p.goal];
  let cal = Math.round(tdee * (1 + g.adj));
  cal = Math.max(cal, Math.round(bmr), p.sex === "male" ? 1500 : 1200);
  const prot = Math.round(g.pkg * p.weight);
  let fat = Math.round(0.9 * p.weight);
  fat = Math.max(fat, Math.round((0.2 * cal) / 9));
  fat = Math.min(fat, Math.round((0.35 * cal) / 9));
  let carb = Math.round((cal - prot * 4 - fat * 9) / 4);
  if (carb < 0) carb = 0;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), cal, p: prot, c: carb, f: fat };
}

export function catColor(cat: string) {
  const m = CATMETA.find((x) => x.key === cat);
  return m ? m.color : "#8A93A2";
}

// ---- visuals ----
/** Deterministic gradient tile from a name (matches prototype photoTile hashing). */
export function gradientFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const h2 = (h + 38) % 360;
  return [`hsl(${h}, 42%, 24%)`, `hsl(${h2}, 52%, 34%)`] as const;
}

export function foodEmoji(food?: Food) {
  if (!food) return "🍽";
  return food.emoji || GLYPHMAP[food.id as number] || "🍽";
}

export function glyphForLog(l: LogEntry, foods: Food[], dishes: Dish[]) {
  if (l.kind === "dish") {
    const d = findDish(dishes, l.dishId);
    return d ? d.emoji || d.glyph || "🍽" : "🍽";
  }
  const f = findFood(foods, l.foodId);
  return foodEmoji(f);
}

export { DISHRAW };
