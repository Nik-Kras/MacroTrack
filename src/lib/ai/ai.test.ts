import { describe, expect, it } from "vitest";

import { FOODS } from "@/data/seed";
import type { Food } from "@/types";

import { bridgeFor, matchCandidates } from "./candidates";
import { activeCorrections, learnFromMeal } from "./learn";
import { IGNORE, Matcher } from "./match";
import { gb } from "./modelFiles";
import { cleanGrams, entryFor, parseLines, photoEntries, toItems } from "./recognition";

const custom = (id: string, name: string, kcal: number, extra: Partial<Food> = {}): Food => ({
  id, name, kcal, p: 0, c: 0, f: 0, cats: ["carbs"], custom: true, ...extra,
});

// The seed list plus custom foods named the way a Ukrainian user names them.
const FOODS_UA: Food[] = [
  ...FOODS,
  custom("c-buckwheat", "Гречка", 343, { cookable: true, yld: 2.6 }),
  custom("c-tvorog", "Сир кисломолочний 5%", 117),
  custom("c-borscht", "Борщ", 46),
  custom("c-potato", "Картопля (варена)", 86),
];

function setup(foods = FOODS_UA, learned: Record<string, string> = {}) {
  const { foods: cands, generic } = matchCandidates(foods);
  return new Matcher(cands, generic, learned);
}

let seq = 0;
const key = () => `k${seq++}`;
const idOf = (name: string, foods = FOODS_UA) => String(foods.find((f) => f.name === name)!.id);

describe("bridge", () => {
  it("links Ukrainian and English names to the same food", () => {
    expect(bridgeFor("Гречка")?.id).toBe("buckwheat-cooked");
    expect(bridgeFor("Картопля (варена)")?.id).toBe("potato-boiled");
    expect(bridgeFor("White rice")?.id).toBe("white-rice-cooked");
    expect(bridgeFor("Something else")).toBeUndefined();
  });
});

describe("matching the user's foods", () => {
  const m = setup();
  it("finds custom foods named in Ukrainian from the model's English", () => {
    expect(m.match("Buckwheat")).toBe("c-buckwheat");
    expect(m.match("Buckwheat porridge")).toBe("c-buckwheat");
    expect(m.match("Cottage cheese")).toBe("c-tvorog");
    expect(m.match("Borscht")).toBe("c-borscht");
    expect(m.match("Beet soup")).toBe("c-borscht");
    expect(m.match("Boiled potatoes")).toBe("c-potato");
    expect(m.match("Potatoes")).toBe("c-potato");
  });
  it("still finds the seed foods by their English names and aliases", () => {
    expect(m.match("White rice")).toBe(idOf("White rice"));
    expect(m.match("Steamed rice")).toBe(idOf("White rice"));
    expect(m.match("Rice")).toBe(idOf("White rice"));
    expect(m.match("Grilled chicken breast")).toBe(idOf("Chicken breast"));
    expect(m.match("Broccoli")).toBe(idOf("Broccoli"));
    expect(m.match("Salmon")).toBe(idOf("Salmon fillet"));
  });
  it("ignores garnish and leaves unknown foods for the user to pick", () => {
    expect(m.match("Lemon wedge")).toBe(IGNORE);
    expect(m.match("Mixed vegetables")).toBeNull();
  });
  it("uses the user's corrections first", () => {
    const learned = setup(FOODS_UA, { "mixed vegetable": "c-borscht" });
    expect(learned.match("Mixed vegetables")).toBe("c-borscht");
  });
  it("does not need any custom food", () => {
    expect(setup(FOODS).match("Rice")).toBe(idOf("White rice", FOODS));
  });
});

describe("photo lines", () => {
  const m = setup();
  it("parses the model's answer and maps it onto the user's foods", () => {
    expect(parseLines("Rice | 150g\n* **Eggs**: 30-40 g")).toEqual([["Rice", 150], ["Eggs", 35]]);
    const r = toItems("Buckwheat | 180g\nWhite rice | 100\nRice | 50\nLemon | 5\nMystery stew | 210", m, key);
    expect(r.isFood).toBe(true);
    expect(r.items.map((i) => [i.foodId, i.grams, !!i.unknown])).toEqual([
      ["c-buckwheat", "180", false],
      [idOf("White rice"), "150", false],
      [undefined, "210", true],
    ]);
    expect(toItems("I can't see any food.", m, key)).toEqual({ isFood: false, items: [] });
  });
  it("logs foods that cook by their cooked weight, the rest as is", () => {
    const buckwheat = FOODS_UA.find((f) => f.id === "c-buckwheat")!;
    const e = entryFor(buckwheat, 260);
    expect([e.grams, e.mode, e.kcal]).toEqual([100, "cooked", 343]);
    const borscht = FOODS_UA.find((f) => f.id === "c-borscht")!;
    expect([entryFor(borscht, 300).grams, entryFor(borscht, 300).kcal]).toEqual([300, 138]);
  });
  it("logs a reviewed photo as one meal, skipping unknown and empty lines", () => {
    const items = [
      { key: "a", foodId: "c-borscht", grams: "300" },
      { key: "b", grams: "50", unknown: true },
      { key: "c", foodId: idOf("White rice"), grams: "" },
    ];
    const today = photoEntries(items, FOODS_UA, 0, 1234);
    expect(today.map((e) => [e.foodId, e.at])).toEqual([["c-borscht", 1234]]);
    expect(photoEntries(items, FOODS_UA, -1, 1234)[0].at).toBeUndefined();
    expect(cleanGrams("0150g")).toBe("150");
  });
});

describe("learning from corrections", () => {
  it("takes effect after the same correction twice", () => {
    const line = { aiName: "Mixed vegetables", aiFoodId: undefined, foodId: "c-borscht" };
    const once = learnFromMeal({}, [line]);
    expect(activeCorrections(once)).toEqual({});
    expect(activeCorrections(learnFromMeal(once, [line]))).toEqual({ "mixed vegetable": "c-borscht" });
  });
});

describe("model download", () => {
  it("shows gigabytes", () => {
    expect(gb(3_655_827_456)).toBe("3.7");
  });
});
