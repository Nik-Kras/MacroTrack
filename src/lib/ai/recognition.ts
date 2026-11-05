import { logFromFood, stampIfToday, toUncooked } from "@/lib/nutrition";
import type { Food, LogEntry } from "@/types";

import { IGNORE, type Matcher } from "./match";

/**
 * Turn the photo model's answer ("Carrots | 150g" lines) into review lines, and
 * reviewed lines into log entries. The prompt and the parsing are MamaKcal's, as
 * benchmarked there. The answer is free text from a small model, so it's treated as
 * untrusted: odd lines are skipped and numbers are clamped. A name that fits none of
 * the user's foods becomes an "unknown" line to pick a food for.
 */

/** What the model is asked; the answer format below depends on it. Benchmarked in bench/. */
export const PROMPT =
  "What foods are on this plate? Answer with one line per food and nothing else, in the form:\n" +
  "<food name> | <grams>\n" +
  "Use a short English name (1 to 3 words) and your best estimate of its weight on the plate in grams. " +
  "Ignore the plate, cutlery and anything that is not food.";

const BULLET = /^\s*(?:[-*•]\s+|\d+[.)]\s*)?\|?\s*/;
const SPLIT = /^(.+?)(?:\s*:\s*|\s+[-–—]\s+)(.*)$/;
const NUM = /(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?/;

const MAX_ITEMS = 12;
const DEFAULT_GRAMS = 100;

/** Split "name | grams" at the bar; failing that at a colon or a spaced dash ("Deep-fried chicken" stays whole). */
function splitLine(line: string): [string, string] | null {
  const s = line.replace(BULLET, "");
  const bar = s.indexOf("|");
  if (bar >= 0) return [s.slice(0, bar), s.slice(bar + 1)];
  const m = SPLIT.exec(s);
  return m ? [m[1], m[2]] : null;
}

/** "Carrots | 150g" lines → [name, grams | null]. A range "30-40" gives its middle. Mirrors bench/score.py parse(). */
export function parseLines(raw: string): [string, number | null][] {
  const out: [string, number | null][] = [];
  for (const line of raw.replace(/\*\*/g, "").split(/\r?\n/)) {
    const parts = splitLine(line);
    if (!parts) continue;
    const name = parts[0].trim().replace(/^[\s*]+|[\s*]+$/g, "");
    const n = NUM.exec(parts[1]);
    let grams: number | null = null;
    if (n) {
      const lo = parseFloat(n[1].replace(",", "."));
      const hi = n[2] ? parseFloat(n[2].replace(",", ".")) : lo;
      grams = (lo + hi) / 2;
    }
    if (name) out.push([name, grams]);
  }
  return out;
}

/** One line of the photo review. */
export interface PhotoItem {
  key: string;
  /** The user's food, as String(food.id); missing while an unknown line waits for a pick. */
  foodId?: string;
  /** Grams on the plate as served (cooked, for foods that cook), as typed. */
  grams: string;
  /** What the model called it, in English: learning keys off this. */
  aiName?: string;
  /** The food the app matched that name to; differs from foodId once corrected. */
  aiFoodId?: string;
  unknown?: boolean;
}

export interface Recognition {
  isFood: boolean;
  items: PhotoItem[];
}

const MAX_GRAMS = 2000;

/** Model answer → review lines, merging lines that land on the same food. */
export function toItems(raw: string, matcher: Matcher, makeKey: () => string): Recognition {
  const rows: { foodId?: string; aiName: string; grams: number }[] = [];
  for (const [aiName, gramsRaw] of parseLines(raw)) {
    const grams = Math.min(MAX_GRAMS, Math.max(5, Math.round((gramsRaw ?? DEFAULT_GRAMS) / 5) * 5));
    const fid = matcher.match(aiName);
    if (fid === IGNORE) continue;
    const same = fid && rows.find((r) => r.foodId === fid);
    if (same) {
      // Two lines for one food ("Strawberries", "Berries"): one line, weights added.
      same.grams = Math.min(MAX_GRAMS, same.grams + grams);
      continue;
    }
    if (rows.length >= MAX_ITEMS) break;
    rows.push({ foodId: fid ?? undefined, aiName, grams });
  }
  const items: PhotoItem[] = rows.map(({ foodId, aiName, grams }) =>
    foodId
      ? { key: makeKey(), foodId, grams: String(grams), aiName, aiFoodId: foodId }
      : { key: makeKey(), grams: String(grams), aiName, unknown: true },
  );
  return { isFood: items.length > 0, items };
}

/** Digits only, at most 4 ("0150" → "150"). */
export function cleanGrams(text: string): string {
  return text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 4);
}

export const findById = (foods: Food[], id?: string) => (id === undefined ? undefined : foods.find((f) => String(f.id) === id));

/**
 * The log entry for one reviewed line. Grams on a plate are as served, so a food
 * that cooks (stored per 100 g uncooked) is logged by its cooked weight.
 */
export function entryFor(food: Food, servedGrams: number): LogEntry {
  if (food.cookable) return logFromFood(food, Math.round(toUncooked(food, servedGrams)), "cooked");
  return logFromFood(food, Math.round(servedGrams));
}

/** Reviewed lines → log entries with one timestamp, so the day log shows them as one meal. */
export function photoEntries(items: PhotoItem[], foods: Food[], dayOffset: number, now = Date.now()): LogEntry[] {
  const out: LogEntry[] = [];
  for (const it of items) {
    const food = findById(foods, it.foodId);
    const g = parseInt(it.grams || "0", 10);
    if (!food || !(g > 0)) continue;
    const e = stampIfToday(entryFor(food, g), dayOffset);
    out.push(e.at ? { ...e, at: now } : e);
  }
  return out;
}
