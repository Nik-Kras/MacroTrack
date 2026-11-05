import { entryMacros } from "@/lib/nutrition";
import type { Dish, Food, LogEntry } from "@/types";

const GAP_MS = 15 * 60 * 1000;
const MEAL_KCAL = 300;

export interface MacroTotals {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

export interface MealGroupSection {
  kind: "group";
  /** stable React key — the first member's entry id */
  id: string;
  title: string;
  entries: LogEntry[];
  totals: MacroTotals;
}

export interface SingleSection {
  kind: "single";
  id: string;
  entry: LogEntry;
}

export type LogSection = MealGroupSection | SingleSection;

/** Meal name from the chain's first bite: 04:00–11:30 Breakfast,
 *  11:30–16:30 Lunch, everything else (incl. 00:00–04:00) Dinner. */
function slotName(at: number): string {
  const d = new Date(at);
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 4 && h < 11.5) return "Breakfast";
  if (h >= 4 && h < 16.5) return "Lunch";
  return "Dinner";
}

/**
 * Derive the day-log display sections: entries chained within 15 minutes of
 * the previous one form a group — a named meal when the chain reaches 300 kcal,
 * a "Snack" when 2+ entries stay under it. Repeated titles are numbered
 * chronologically ("Lunch 2"). Solo sub-300 entries and entries without a
 * timestamp stay flat; untimed entries render first because they predate any
 * timed entry for that day (insertion order — the pre-feature look).
 */
export function groupDayLog(entries: LogEntry[], foods: Food[], dishes: Dish[]): LogSection[] {
  const sections: LogSection[] = [];
  const timed: LogEntry[] = [];
  for (const e of entries) {
    if (typeof e.at === "number") timed.push(e);
    else sections.push({ kind: "single", id: e.id, entry: e });
  }
  timed.sort((a, b) => a.at! - b.at!);

  const chains: LogEntry[][] = [];
  for (const e of timed) {
    const chain = chains[chains.length - 1];
    if (chain && e.at! - chain[chain.length - 1].at! <= GAP_MS) chain.push(e);
    else chains.push([e]);
  }

  const counts = new Map<string, number>();
  for (const chain of chains) {
    const totals = chain.reduce<MacroTotals>(
      (a, e) => {
        const m = entryMacros(e, foods, dishes);
        return { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f };
      },
      { kcal: 0, p: 0, c: 0, f: 0 },
    );
    if (chain.length === 1 && totals.kcal < MEAL_KCAL) {
      sections.push({ kind: "single", id: chain[0].id, entry: chain[0] });
      continue;
    }
    const label = totals.kcal >= MEAL_KCAL ? slotName(chain[0].at!) : "Snack";
    const n = (counts.get(label) ?? 0) + 1;
    counts.set(label, n);
    sections.push({ kind: "group", id: chain[0].id, title: n === 1 ? label : `${label} ${n}`, entries: chain, totals });
  }

  return sections;
}
