import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";

import { loadState, saveState, type PersistShape } from "./persistence";

import {
  CATMETA,
  DEFAULT_PROFILE,
  DISHRAW,
  FOODS,
} from "@/data/seed";
import { todayISO } from "@/lib/body";
import { computeTargets } from "@/lib/nutrition";
import type {
  CategoryKey,
  CookMode,
  Dish,
  Food,
  LogMap,
  Measurement,
  MetricKey,
  Profile,
} from "@/types";

export type OverlayKey =
  | "calendar"
  | "addFood"
  | "grams"
  | "dish"
  | "onb"
  | "measure"
  | "foodEdit"
  | "dishEdit";

export interface FoodDraft {
  id: number | string | null;
  name: string;
  p: number | string;
  c: number | string;
  f: number | string;
  kcal: number;
  kcalManual: boolean;
  emoji: string;
  photo: string;
  cats: CategoryKey[];
  custom: boolean;
  cookable: boolean;
  yld: number | string;
  fromDish?: boolean;
}

export interface DishDraft {
  id: string | null;
  name: string;
  servings: number;
  emoji: string;
  photo: string;
  ing: { foodId: number | string; grams: number; mode: CookMode }[];
  /** Measured total cooked weight (grams). Empty = use the predicted value. */
  cookedWeight?: number | string;
}

export interface AppState {
  // navigation / ui
  screen: "nutrition" | "dishes" | "profile" | "stats" | "measureDetail";
  dayOffset: number;
  ov: OverlayKey | null;
  // data
  profile: Profile;
  logs: LogMap;
  foods: Food[];
  dishes: Dish[];
  measurements: Measurement[];
  // add-food overlay
  addSearch: string;
  addCat: "all" | CategoryKey;
  selFood: number | string | null;
  addGrams: number;
  searchMode: "log" | "dish";
  // dish overlay
  selDish: string | null;
  dishServings: number;
  dishLogMode: "servings" | "cooked";
  dishCookedGrams: number;
  // grams editor
  editId: string | null;
  gTarget: "log" | "edit" | "ingredient";
  gMode: CookMode;
  gIngIdx: number | null;
  // onboarding / measure
  draft: Profile | null;
  measureMetric: MetricKey;
  measureVal: number;
  /** which metric the measurement-detail screen is showing */
  detailMetric: MetricKey;
  // stats / calendar
  statsSpan: "day" | "week" | "month" | "all";
  calY: number;
  calM: number;
  // editors
  foodDraft: FoodDraft | null;
  dishDraft: DishDraft | null;
}

const initialUI = {
  screen: "nutrition" as const,
  dayOffset: 0,
  ov: null,
  addSearch: "",
  addCat: "all" as const,
  selFood: null,
  addGrams: 100,
  searchMode: "log" as const,
  selDish: null,
  dishServings: 1,
  dishLogMode: "servings" as const,
  dishCookedGrams: 0,
  editId: null,
  gTarget: "log" as const,
  gMode: "raw" as CookMode,
  gIngIdx: null,
  draft: null,
  measureMetric: "weight" as MetricKey,
  measureVal: 70,
  detailMetric: "weight" as MetricKey,
  statsSpan: "week" as const,
  calY: new Date().getFullYear(),
  calM: new Date().getMonth(),
  foodDraft: null,
  dishDraft: null,
};

function buildInitial(profile: Profile): AppState {
  return {
    ...initialUI,
    profile,
    logs: {},
    foods: FOODS.map((f) => ({ ...f })),
    dishes: DISHRAW.map((d) => ({ ...d, ing: d.ing.map((p) => [...p] as [number | string, number]) })),
    measurements: [],
    measureVal: profile.weight,
  };
}

interface Store {
  state: AppState;
  hydrated: boolean;
  /** shallow-merge a partial into state (mirrors prototype setState). */
  patch: (p: Partial<AppState>) => void;
  open: (ov: OverlayKey, extra?: Partial<AppState>) => void;
  close: () => void;
  // body measurements
  addMeasurement: (metric: MetricKey, val: number) => void;
  deleteMeasurement: (id: string) => void;
  /** Replace all persisted data (e.g. from an imported backup). */
  restore: (data: PersistShape) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children, name }: { children: React.ReactNode; name?: string }) {
  const [state, setState] = useState<AppState>(() =>
    buildInitial({ ...DEFAULT_PROFILE, name: name || DEFAULT_PROFILE.name }),
  );
  const [hydrated, setHydrated] = useState(false);
  // Monotonic counter for unique measurement ids within a session.
  const seqRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always holds the latest persistable slice so we can flush synchronously
  // (e.g. when the app is backgrounded) without waiting for the debounce.
  const latest = useRef<PersistShape | null>(null);

  // hydrate persisted data slice once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await loadState();
        if (active && data) {
          setState((s) => ({
            ...s,
            profile: data.profile ?? s.profile,
            logs: data.logs ?? s.logs,
            foods: data.foods ?? s.foods,
            dishes: data.dishes ?? s.dishes,
            measurements: data.measurements ?? s.measurements,
            measureVal: (data.profile ?? s.profile).weight,
          }));
        }
      } catch (e) {
        // Corrupt/unreadable store — fall back to seed (already in state).
        console.warn("[MacroTrack] load failed, using seed data:", e);
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Durable write with a single retry; never swallows the final failure silently.
  const flush = useCallback(async () => {
    const data = latest.current;
    if (!data) return;
    try {
      await saveState(data);
    } catch (e) {
      try {
        await saveState(data);
      } catch (e2) {
        console.error("[MacroTrack] failed to persist data:", e2 || e);
      }
    }
  }, []);

  // persist the data slice (debounced) after hydration
  useEffect(() => {
    if (!hydrated) return;
    latest.current = {
      profile: state.profile,
      logs: state.logs,
      foods: state.foods,
      dishes: state.dishes,
      measurements: state.measurements,
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flush();
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, flush, state.profile, state.logs, state.foods, state.dishes, state.measurements]);

  // Flush immediately when the app is backgrounded/closed so a kill within the
  // debounce window can't lose the most recent edit.
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") void flush();
    });
    return () => sub.remove();
  }, [flush]);

  const patch = useCallback((p: Partial<AppState>) => setState((s) => ({ ...s, ...p })), []);
  const open = useCallback(
    (ov: OverlayKey, extra: Partial<AppState> = {}) => setState((s) => ({ ...s, ov, ...extra })),
    [],
  );
  const close = useCallback(
    () =>
      setState((s) => ({
        ...s,
        ov: null,
        selFood: null,
        selDish: null,
        editId: null,
        draft: null,
        foodDraft: null,
        dishDraft: null,
      })),
    [],
  );

  const store = useMemo<Store>(() => {
    return {
      state,
      hydrated,
      patch,
      open,
      close,
      addMeasurement: (metric, val) => {
        setState((s) => ({
          ...s,
          measurements: [
            ...s.measurements,
            { id: "m" + Date.now().toString(36) + (seqRef.current++).toString(36), metric, value: val, date: todayISO() },
          ],
        }));
      },
      deleteMeasurement: (id) => {
        setState((s) => ({ ...s, measurements: s.measurements.filter((m) => m.id !== id) }));
      },
      restore: (data) => {
        setState((s) => ({
          ...s,
          profile: data.profile ?? s.profile,
          logs: data.logs ?? s.logs,
          foods: data.foods ?? s.foods,
          dishes: data.dishes ?? s.dishes,
          measurements: data.measurements ?? s.measurements,
          measureVal: (data.profile ?? s.profile).weight,
          // reset transient UI so nothing dangles from the previous data set
          ov: null,
          screen: "profile",
          dayOffset: 0,
          selFood: null,
          selDish: null,
          editId: null,
          foodDraft: null,
          dishDraft: null,
          draft: null,
        }));
      },
    };
  }, [state, hydrated, patch, open, close]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within AppProvider");
  return s;
}

// convenience selectors
export const useTargets = () => {
  const { state } = useStore();
  return useMemo(() => computeTargets(state.profile), [state.profile]);
};

export { CATMETA };
