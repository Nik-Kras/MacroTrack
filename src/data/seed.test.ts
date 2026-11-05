import { describe, expect, it } from "vitest";

import { FOODS, refreshSeedYields } from "@/data/seed";
import type { Food } from "@/types";

const yld = (foods: Food[], id: number) => foods.find((f) => f.id === id)?.yld;

describe("cooking yields (1.3.0)", () => {
  it("uses researched yields: 100 g raw chicken ≈ 75 g cooked, 100 g dry pasta ≈ 235 g cooked", () => {
    expect(yld(FOODS, 1)).toBe(0.75);
    expect(yld(FOODS, 19)).toBe(2.35);
    expect(yld(FOODS, 13)).toBe(2.8);
    expect(yld(FOODS, 28)).toBe(0.85);
  });

  it("updates saved built-in foods still on the old yield, and leaves the user's own changes alone", () => {
    const saved: Food[] = FOODS.map((f) => ({ ...f }));
    saved.find((f) => f.id === 1)!.yld = 0.85; // old seed value
    saved.find((f) => f.id === 19)!.yld = 2.3; // old seed value
    saved.find((f) => f.id === 13)!.yld = 3.1; // changed by the user
    saved.push({ id: "c-buckwheat", name: "Гречка", kcal: 343, p: 13, c: 72, f: 3.4, cats: ["carbs"], custom: true, cookable: true, yld: 2.6 });
    const out = refreshSeedYields(saved);
    expect(yld(out, 1)).toBe(0.75);
    expect(yld(out, 19)).toBe(2.35);
    expect(yld(out, 13)).toBe(3.1);
    expect(out.find((f) => f.id === "c-buckwheat")!.yld).toBe(2.6);
    expect(refreshSeedYields(out)).toEqual(out); // runs on every load; idempotent
  });
});
