import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  BODY_RAW,
  CATMETA,
  DEFAULT_PROFILE,
  DISHRAW,
  FOODS,
} from "@/data/seed";
import { computeTargets, seedLogs } from "@/lib/nutrition";
import type {
  BodyRecord,
  CategoryKey,
  CookMode,
  Dish,
  Food,
  LogMap,
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
}

export interface AppState {
  // navigation / ui
  screen: "nutrition" | "dishes" | "profile" | "stats";
  dayOffset: number;
  ov: OverlayKey | null;
  // data
  profile: Profile;
  logs: LogMap;
  foods: Food[];
  dishes: Dish[];
  extraBody: BodyRecord[];
  // add-food overlay
  addSearch: string;
  addCat: "all" | CategoryKey;
  selFood: number | string | null;
  addGrams: number;
  searchMode: "log" | "dish";
  // dish overlay
  selDish: string | null;
  dishServings: number;
  // grams editor
  editId: string | null;
  gTarget: "log" | "edit" | "ingredient";
  gMode: CookMode;
  gIngIdx: number | null;
  // onboarding / measure
  draft: Profile | null;
  measureMetric: keyof Omit<BodyRecord, "d">;
  measureVal: number;
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
  editId: null,
  gTarget: "log" as const,
  gMode: "raw" as CookMode,
  gIngIdx: null,
  draft: null,
  measureMetric: "weight" as const,
  measureVal: 78,
  statsSpan: "week" as const,
  calY: 2026,
  calM: 5,
  foodDraft: null,
  dishDraft: null,
};

function buildInitial(profile: Profile): AppState {
  return {
    ...initialUI,
    profile,
    logs: seedLogs(profile),
    foods: FOODS.map((f) => ({ ...f })),
    dishes: DISHRAW.map((d) => ({ ...d, ing: d.ing.map((p) => [...p] as [number | string, number]) })),
    extraBody: [],
    measureVal: profile.weight,
  };
}

interface PersistShape {
  profile: Profile;
  logs: LogMap;
  foods: Food[];
  dishes: Dish[];
  extraBody: BodyRecord[];
}

const STORAGE_KEY = "macrotrack:v1";

interface Store {
  state: AppState;
  hydrated: boolean;
  /** shallow-merge a partial into state (mirrors prototype setState). */
  patch: (p: Partial<AppState>) => void;
  open: (ov: OverlayKey, extra?: Partial<AppState>) => void;
  close: () => void;
  // body
  bodyRecords: () => BodyRecord[];
  latestBody: () => BodyRecord;
  addMeasurement: (metric: keyof Omit<BodyRecord, "d">, val: number) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children, name }: { children: React.ReactNode; name?: string }) {
  const [state, setState] = useState<AppState>(() =>
    buildInitial({ ...DEFAULT_PROFILE, name: name || DEFAULT_PROFILE.name }),
  );
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // hydrate persisted data slice once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const data = JSON.parse(raw) as PersistShape;
          setState((s) => ({
            ...s,
            profile: data.profile ?? s.profile,
            logs: data.logs ?? s.logs,
            foods: data.foods ?? s.foods,
            dishes: data.dishes ?? s.dishes,
            extraBody: data.extraBody ?? s.extraBody,
            measureVal: (data.profile ?? s.profile).weight,
          }));
        }
      } catch {
        // ignore corrupt cache — fall back to seed
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // persist the data slice (debounced) after hydration
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const data: PersistShape = {
        profile: state.profile,
        logs: state.logs,
        foods: state.foods,
        dishes: state.dishes,
        extraBody: state.extraBody,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, state.profile, state.logs, state.foods, state.dishes, state.extraBody]);

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
    const bodyRecords = () => [...BODY_RAW.map((b) => ({ ...b })), ...state.extraBody];
    const latestBody = () => {
      const r = bodyRecords();
      return r[r.length - 1];
    };
    return {
      state,
      hydrated,
      patch,
      open,
      close,
      bodyRecords,
      latestBody,
      addMeasurement: (metric, val) => {
        setState((s) => {
          const recs = [...BODY_RAW.map((b) => ({ ...b })), ...s.extraBody];
          const last = { ...recs[recs.length - 1] };
          (last as any)[metric] = val;
          last.d = (last.d || 0) + 1;
          return { ...s, extraBody: [...s.extraBody, last] };
        });
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
