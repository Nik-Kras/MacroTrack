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
  Macros,
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

// ---- pieces: foods counted by the item ----
/** Entered per item without its weight: counted in pieces only. */
export const piecesOnly = (food?: Food) => !!food?.item && !food.pieceG;
/** Can be logged in pieces: entered per item, or has an item weight. */
export const countable = (food?: Food) => !!food && (!!food.item || !!food.pieceG);

/** The values for one item: as entered, or per 100 g scaled to the item weight; null when it can't be counted. */
export function itemValues(food: Food): Macros | null {
  if (food.item) return food.item;
  return food.pieceG ? scaleMacros(food, food.pieceG / 100) : null;
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return { kcal: m.kcal * factor, p: m.p * factor, c: m.c * factor, f: m.f * factor };
}

/** As stored on an entry: whole kcal, macros to 0.1 g. */
export function roundMacros(m: Macros): Macros {
  return { kcal: round(m.kcal), p: +m.p.toFixed(1), c: +m.c.toFixed(1), f: +m.f.toFixed(1) };
}

/** "1.5" pieces, at most two decimals. */
export const fmtPieces = (n: number) => String(+n.toFixed(2));

/** A count she typed ("2", "1.5", "1,5"); null when it isn't usable. */
export function parsePieces(text: string): number | null {
  const n = parseFloat(text.replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
}

/** How the amount sheet opens: 1 piece for a countable food, unless it was last logged in grams. */
export const startPieces = (food: Food): number | null => (piecesOnly(food) || (countable(food) && food.unit !== "g") ? 1 : null);

/** "450 kcal · P20 C45 F18 / pc" or "… /100g". */
export function foodSummary(food: Food) {
  const { m, per } = shownValues(food);
  const r1 = (x: number) => +x.toFixed(1);
  return `${round(m.kcal)} kcal · P${r1(m.p)} C${r1(m.c)} F${r1(m.f)} ${per === "pc" ? "/ pc" : "/100g"}`;
}

/** What a food's values are shown for: one item when it was entered that way, else 100 g. */
export function shownValues(food: Food): { m: Macros; per: "pc" | "100g" } {
  return food.item ? { m: food.item, per: "pc" } : { m: food, per: "100g" };
}

/** How much was logged: "2 pcs · 110 g", "1 pc", or the weight. */
export function amountLabel(e: LogEntry, food: Food | undefined) {
  if (e.pieces == null) return weightLabel(food, e.grams, e.mode);
  const g = food?.pieceG ? Math.round(e.pieces * food.pieceG) : e.grams;
  return `${fmtPieces(e.pieces)} ${e.pieces === 1 ? "pc" : "pcs"}${g > 0 ? ` · ${g} g` : ""}`;
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
  return {
    id: "l" + Math.random().toString(36).slice(2, 8),
    kind: "food",
    foodId: food.id,
    name: food.name,
    grams,
    mode: food.cookable ? mode || "raw" : "na",
    ...roundMacros(scaleMacros(food, grams / 100)),
    cat: food.cats[0],
  };
}

/** Log a food by count; its grams are the pieces × the item weight (uncooked), or 0 without one. */
export function logPieces(food: Food, pieces: number): LogEntry {
  const one = itemValues(food) ?? { kcal: 0, p: 0, c: 0, f: 0 };
  return {
    ...logFromFood(food, food.pieceG ? Math.round(pieces * food.pieceG) : 0, "raw"),
    ...roundMacros(scaleMacros(one, pieces)),
    pieces,
  };
}

/** Entries logged to a past day have no trustworthy clock time, so only the
 *  live day gets a timestamp; the rest stay ungrouped. */
export function stampIfToday(entry: LogEntry, dayOffset: number): LogEntry {
  return dayOffset === 0 ? { ...entry, at: Date.now() } : entry;
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
    // Logged by count: the count stays, whatever the item weighs now.
    const one = e.pieces != null ? itemValues(fo) : null;
    if (one) return roundMacros(scaleMacros(one, e.pieces!));
    // A food that is now counted in pieces only has no per-100 g values to scale.
    if (piecesOnly(fo) || !(e.grams > 0)) return snapshot;
    return roundMacros(scaleMacros(fo, e.grams / 100));
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
