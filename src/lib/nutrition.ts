import {
  ACT,
  BASE_DATE,
  CATMETA,
  DISHRAW,
  FOODS,
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
  let k = 0, p = 0, c = 0, f = 0, g = 0;
  d.ing.forEach(([id, gr]) => {
    const fo = findFood(foods, id);
    if (!fo) return;
    const r = gr / 100;
    k += fo.kcal * r; p += fo.p * r; c += fo.c * r; f += fo.f * r; g += gr;
  });
  return {
    kcal: k, p, c, f, grams: g,
    perKcal: k / d.servings, perP: p / d.servings, perC: c / d.servings, perF: f / d.servings,
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

// ---- seed history generation (so calendar / stats agree) ----
function buildDay(off: number, targetCal: number): LogEntry[] {
  const variants: [number, number][][] = [
    [[1, 200], [13, 250], [12, 60], [16, 120], [4, 200], [22, 15]],
    [[10, 220], [14, 240], [7, 150], [21, 80], [3, 100], [27, 150]],
    [[2, 250], [13, 260], [5, 150], [23, 25], [28, 80], [24, 15]],
    [[9, 180], [19, 260], [29, 40], [20, 150], [11, 150], [22, 12]],
  ];
  const tmpl = variants[((off % variants.length) + variants.length) % variants.length];
  const baseK = tmpl.reduce((a, [id, g]) => a + findFood(FOODS, id)!.kcal * g / 100, 0);
  const desired = targetCal + Math.round(Math.sin(off * 1.3) * 240 - 70);
  const factor = desired / baseK;
  return tmpl.map(([id, g]) =>
    logFromFood(findFood(FOODS, id)!, Math.max(10, Math.round((g * factor) / 5) * 5)),
  );
}

/** Build the initial seeded log map (today, yesterday, and -13..-2 history). */
export function seedLogs(profile: Profile) {
  const today = dayKey(0), yest = dayKey(-1);
  const mk = (id: number, grams: number) => logFromFood(findFood(FOODS, id)!, grams);
  const logs: Record<string, LogEntry[]> = {};
  logs[today] = [mk(3, 150), mk(4, 200), mk(16, 120)];
  logs[yest] = [mk(12, 80), mk(8, 30), mk(1, 220), mk(13, 250), mk(21, 90), mk(4, 150)];
  const seedCal = computeTargets(profile).cal;
  for (let off = -13; off <= -2; off++) logs[dayKey(off)] = buildDay(off, seedCal);
  return logs;
}

export { DISHRAW };
