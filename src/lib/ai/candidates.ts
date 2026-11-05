import bridgeRaw from "@/data/bridge.json";
import { piecesOnly } from "@/lib/nutrition";
import type { Food } from "@/types";

import type { MatchFood } from "./match";

/**
 * Which of the user's foods the photo model's English answers can reach.
 *
 * The model names foods in English ("Buckwheat"). A food named in English matches on
 * its own name; a custom food named in Ukrainian («Гречка») is linked through the
 * bridge — MamaKcal's list of Ukrainian home food, where every food has its Ukrainian
 * and English names (src/data/bridge.json) — and takes that entry's English name and
 * aliases. English names are linked too, which gives them more aliases
 * ("White rice" also answers to "boiled rice").
 */

interface BridgeEntry {
  id: string;
  en: string;
  aliases: string[];
  ua: string;
  aliasesUa: string[];
}

const BRIDGE = bridgeRaw as BridgeEntry[];

/** A bare generic word → the bridge food it most likely is (as in MamaKcal). */
const BRIDGE_GENERIC: Record<string, string> = {
  rice: "white-rice-cooked", potato: "potato-boiled", chicken: "chicken-breast-cooked",
  fish: "hake-cooked", egg: "eggs-whole", bread: "white-bread", cheese: "hard-cheese",
  salad: "mixed-greens", greens: "mixed-greens", lettuce: "mixed-greens", squash: "zucchini",
  beef: "beef-cooked", pork: "pork-roast", berries: "berries-mix", berry: "berries-mix",
  yogurt: "yogurt-natural", milk: "milk-2-5", beans: "kidney-beans-cooked", bean: "kidney-beans-cooked",
  oil: "sunflower-oil", sausage: "kovbasa", noodles: "pasta-cooked", spaghetti: "pasta-cooked",
  melon: "melon", turkey: "turkey-breast-cooked", pepper: "bell-pepper", peppers: "bell-pepper",
  tomatoes: "tomato", carrot: "carrots-raw", nuts: "walnuts", buckwheat: "buckwheat-cooked",
  varenyky: "varenyky-potato", dumplings: "varenyky-potato", pancakes: "mlyntsi",
};

/** When no food is linked to the bridge default: the seed food of this name. */
const SEED_GENERIC: Record<string, string> = {
  rice: "White rice", chicken: "Chicken breast", egg: "Egg", bread: "Whole wheat bread", cheese: "Cheddar cheese",
  beef: "Lean beef", yogurt: "Greek yogurt 0%", milk: "Milk 2%", beans: "Black beans", bean: "Black beans",
  oil: "Olive oil", nuts: "Almonds", pasta: "Pasta", noodles: "Pasta", spaghetti: "Pasta", oats: "Oats",
  oatmeal: "Oats", lentils: "Lentils", salmon: "Salmon fillet", tuna: "Tuna, canned",
};

/** Lower case, no apostrophes or brackets, ї/є/ґ/ё folded, single spaces. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’'`ʼ"«»]/g, "")
    .replace(/ё/g, "е")
    .replace(/ї/g, "і")
    .replace(/є/g, "е")
    .replace(/ґ/g, "г")
    .replace(/[()[\],.;:!?/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every name a bridge entry is known by (Ukrainian and English) → its entry. */
const BY_NAME = (() => {
  const m = new Map<string, BridgeEntry>();
  for (const b of BRIDGE) {
    for (const n of [b.ua, ...b.aliasesUa, b.en, ...b.aliases]) {
      const k = norm(n);
      if (k && !m.has(k)) m.set(k, b);
    }
  }
  return m;
})();

/** The bridge entry a food's name stands for, if any: «Гречка (варена)», «Гречка», "White rice". */
export function bridgeFor(name: string): BridgeEntry | undefined {
  const keys = [norm(name), norm(name.replace(/\([^)]*\)/g, " "))];
  for (const k of keys) {
    const b = k ? BY_NAME.get(k) : undefined;
    if (b) return b;
  }
  return undefined;
}

const LATIN = /[a-z]/i;

/**
 * The user's foods as the matcher sees them, custom foods first (their own foods win
 * ties), and the everyday default for generic words.
 */
export function matchCandidates(foods: Food[]): { foods: MatchFood[]; generic: Record<string, string> } {
  // Photo lines are weighed: a food counted in pieces only can't be one.
  const weighed = foods.filter((f) => !piecesOnly(f));
  const ordered = [...weighed.filter((f) => f.custom), ...weighed.filter((f) => !f.custom)];
  const linked = new Map<string, string>(); // bridge id → first food id linked to it
  const out: MatchFood[] = ordered.map((f) => {
    const id = String(f.id);
    const b = bridgeFor(f.name);
    if (b && !linked.has(b.id)) linked.set(b.id, id);
    return {
      id,
      nameEn: LATIN.test(f.name) ? f.name : undefined,
      aliases: b ? [b.en, ...b.aliases] : [],
    };
  });
  const generic: Record<string, string> = {};
  const byName = new Map(ordered.map((f) => [norm(f.name), String(f.id)]));
  for (const [word, bid] of Object.entries(BRIDGE_GENERIC)) {
    const id = linked.get(bid);
    if (id) generic[word] = id;
  }
  for (const [word, name] of Object.entries(SEED_GENERIC)) {
    const id = byName.get(norm(name));
    if (id && !generic[word]) generic[word] = id;
  }
  return { foods: out, generic };
}
