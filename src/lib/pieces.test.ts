import { describe, expect, it } from "vitest";

import { matchCandidates } from "@/lib/ai/candidates";
import {
  amountLabel,
  entryMacros,
  foodSummary,
  logFromFood,
  logPieces,
  parsePieces,
  startPieces,
} from "@/lib/nutrition";
import { openFoodEditor, saveFood } from "@/overlays/editorActions";
import type { FoodDraft } from "@/store/store";
import type { Food } from "@/types";

const food = (id: string, extra: Partial<Food>): Food => ({ id, name: id, kcal: 0, p: 0, c: 0, f: 0, cats: ["carbs"], custom: true, ...extra });

// Entered per item with its weight: per 100 g worked out, the item values kept exact.
const sandwich = food("sandwich", { kcal: 252.6, p: 10.98, c: 26.01, f: 11.56, item: { kcal: 437, p: 19, c: 45, f: 20 }, pieceG: 173 });
// Entered per item without a weight: pieces only.
const pizzaSlice = food("pizza-slice", { item: { kcal: 285, p: 12, c: 36, f: 10 } });
// Per 100 g with an item weight.
const egg = food("egg", { kcal: 143, p: 12.6, c: 0.7, f: 9.5, pieceG: 55 });

const fakeStore = (foods: Food[], draft: FoodDraft | null = null) => {
  const store = {
    state: { foods, dishes: [], ov: "addFood" as const, searchMode: "log" as const, dishDraft: null, foodDraft: draft },
    patch: (p: any) => Object.assign(store.state, p),
  };
  return store;
};

describe("logging in pieces", () => {
  it("counts a food entered per item exactly, with its weight", () => {
    const e = logPieces(sandwich, 2);
    expect(e).toMatchObject({ pieces: 2, grams: 346, kcal: 874, p: 38, c: 90, f: 40 });
  });

  it("logs a pieces-only food with no grams", () => {
    expect(logPieces(pizzaSlice, 1.5)).toMatchObject({ pieces: 1.5, grams: 0, kcal: 428, p: 18 });
  });

  it("scales per 100 g by the item weight", () => {
    expect(logPieces(egg, 2)).toMatchObject({ pieces: 2, grams: 110, kcal: 157, p: 13.9 });
  });

  it("keeps the count when the item weight changes later", () => {
    const e = logPieces(egg, 2);
    expect(entryMacros(e, [{ ...egg, pieceG: 60 }], []).kcal).toBe(172);
    expect(amountLabel(e, { ...egg, pieceG: 60 })).toBe("2 pcs · 120 g");
  });

  it("falls back to the logged grams when the food can no longer be counted", () => {
    const e = logPieces(egg, 2);
    expect(entryMacros(e, [{ ...egg, pieceG: undefined }], []).kcal).toBe(157);
  });

  it("keeps a gram entry's values when its food became pieces-only", () => {
    const e = logFromFood(egg, 100);
    expect(entryMacros(e, [{ ...egg, kcal: 0, p: 0, c: 0, f: 0, item: { kcal: 80, p: 7, c: 0, f: 5 }, pieceG: undefined }], []).kcal).toBe(143);
  });

  it("labels amounts", () => {
    expect(amountLabel(logPieces(pizzaSlice, 1), pizzaSlice)).toBe("1 pc");
    expect(amountLabel(logFromFood(egg, 120), egg)).toBe("120 g");
  });

  it("reads counts and picks the starting unit", () => {
    expect(parsePieces("1,5")).toBe(1.5);
    expect(parsePieces("0")).toBeNull();
    expect(parsePieces("")).toBeNull();
    expect(startPieces(pizzaSlice)).toBe(1);
    expect(startPieces(egg)).toBe(1);
    expect(startPieces({ ...egg, unit: "g" })).toBeNull();
    expect(startPieces({ ...egg, pieceG: undefined })).toBeNull();
  });

  it("shows foods per item or per 100 g", () => {
    expect(foodSummary(pizzaSlice)).toBe("285 kcal · P12 C36 F10 / pc");
    expect(foodSummary(egg)).toBe("143 kcal · P12.6 C0.7 F9.5 /100g");
  });

  it("keeps pieces-only foods out of photo matching", () => {
    const ids = matchCandidates([sandwich, pizzaSlice, egg]).foods.map((f) => f.id);
    expect(ids).toEqual(["sandwich", "egg"]);
  });
});

describe("food editor per item", () => {
  const edit = (f: Food | null, change: Partial<FoodDraft>) => {
    const store = fakeStore(f ? [f] : []);
    openFoodEditor(store, f);
    store.patch({ foodDraft: { ...store.state.foodDraft!, ...change } });
    return saveFood(store);
  };

  it("works out per 100 g from the item weight", () => {
    const saved = edit(null, { name: "Sandwich", per: "pc", p: "19", c: "45", f: "20", kcal: 437, kcalManual: true, pieceG: "173" });
    expect(saved).toMatchObject({ item: { kcal: 437, p: 19, c: 45, f: 20 }, pieceG: 173, kcal: 252.6, p: 10.98, c: 26.01, f: 11.56 });
    // Pieces and their grams agree.
    expect(logFromFood(saved, 346)).toMatchObject({ kcal: 874, p: 38, c: 90, f: 40 });
  });

  it("saves a pieces-only food without cooking or gram amounts", () => {
    const saved = edit(null, { name: "Slice", per: "pc", p: "12", c: "36", f: "10", cookable: true, presets: [{ g: "50", name: "" }] });
    expect(saved).toMatchObject({ item: { kcal: 282, p: 12, c: 36, f: 10 }, kcal: 0, cookable: false });
    expect(saved.pieceG).toBeUndefined();
    expect(saved.presets).toBeUndefined();
  });

  it("opens a food entered per item with its item values, and can go back to per 100 g", () => {
    const store = fakeStore([sandwich]);
    openFoodEditor(store, sandwich);
    expect(store.state.foodDraft).toMatchObject({ per: "pc", kcal: 437, p: 19, pieceG: "173" });
    const saved = edit(sandwich, { per: "100g", p: "11", c: "26", f: "11.6", kcal: 253, pieceG: "" });
    expect(saved.item).toBeUndefined();
    expect(saved.pieceG).toBeUndefined();
    expect(saved.kcal).toBe(253);
  });

  it("adds an item weight to a food per 100 g", () => {
    const saved = edit(food("egg", { kcal: 143, p: 12.6, c: 0.7, f: 9.5 }), { pieceG: "55" });
    expect(saved).toMatchObject({ kcal: 143, pieceG: 55 });
    expect(saved.item).toBeUndefined();
  });
});
