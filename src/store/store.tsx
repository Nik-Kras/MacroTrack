import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";

import { loadState, saveState, type PersistShape } from "./persistence";

import {
  CATMETA,
  DEFAULT_PROFILE,
  DISHRAW,
  FOODS,
} from "@/data/seed";
import { matchCandidates } from "@/lib/ai/candidates";
import { activeCorrections, learnFromMeal, type Correction } from "@/lib/ai/learn";
import { Matcher } from "@/lib/ai/match";
import { prepareMealPhoto } from "@/lib/ai/photo";
import { photoEntries, type PhotoItem } from "@/lib/ai/recognition";
import { recognizeMeal, RecognizeFailure, unloadModel } from "@/lib/ai/recognize";
import { todayISO } from "@/lib/body";
import { syncMeasureReminder } from "@/lib/measureReminder";
import { computeTargets, dayKey } from "@/lib/nutrition";
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
  | "dishEdit"
  | "photo";

/** A meal photo being recognised or reviewed (the "photo" overlay). */
export interface PhotoRun {
  id: number;
  /** The resized photo the model reads; the camera file until it's ready. */
  uri: string;
  status: "working" | "nofood" | "failed" | "nomodel" | "done";
  items: PhotoItem[];
}

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
  /** Quick-amount rows being edited; grams kept as raw input text until save. */
  presets: { g: string; name: string }[];
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
  /** What picking a food in Add food does: log it, add it to a dish, or set a photo line. */
  searchMode: "log" | "dish" | "photo";
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
  // photo recognition
  photo: PhotoRun | null;
  /** Photo line being swapped or resolved in Add food; "new" = add a line. */
  photoPick: string | null;
  /** Learned corrections: what the model calls a food → the user's food. */
  learned: Record<string, Correction>;
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
  photo: null,
  photoPick: null,
};

function buildInitial(profile: Profile): AppState {
  return {
    ...initialUI,
    profile,
    logs: {},
    foods: FOODS.map((f) => ({ ...f })),
    dishes: DISHRAW.map((d) => ({ ...d, ing: d.ing.map((p) => [...p] as [number | string, number]) })),
    measurements: [],
    learned: {},
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
  // photo recognition
  /** Recognise a camera or gallery photo; opens the photo overlay. */
  startPhoto: (src: string, width: number, height: number) => void;
  retryPhoto: () => void;
  /** Stop and close the photo overlay without logging. */
  cancelPhoto: () => void;
  updatePhotoItems: (fn: (items: PhotoItem[]) => PhotoItem[]) => void;
  /** Log the reviewed photo as one meal and learn from the corrections. */
  logPhoto: () => void;
  /** Foods like what the model saw on a photo line ("Схожі" in MamaKcal). */
  photoSuggestions: (key: string) => Food[];
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
            learned: data.learned ?? s.learned,
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
      learned: state.learned,
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flush();
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, flush, state.profile, state.logs, state.foods, state.dishes, state.measurements, state.learned]);

  // Flush immediately when the app is backgrounded/closed so a kill within the
  // debounce window can't lose the most recent edit.
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") void flush();
      // The 3.7 GB model makes the app the first thing Android kills in the background;
      // it reloads on the next photo. Not while a photo is being recognised.
      if (next === "background" && !photoAbort.current) unloadModel();
    });
    return () => sub.remove();
  }, [flush]);

  // Keep the weekly-measurement reminder in sync with the logged data.
  useEffect(() => {
    if (!hydrated) return;
    void syncMeasureReminder(state.measurements);
  }, [hydrated, state.measurements]);

  // ---- photo recognition
  const stateRef = useRef(state);
  stateRef.current = state;
  const matcher = useMemo(() => {
    const { foods, generic } = matchCandidates(state.foods);
    return new Matcher(foods, generic, activeCorrections(state.learned));
  }, [state.foods, state.learned]);
  const matcherRef = useRef(matcher);
  matcherRef.current = matcher;
  const photoAbort = useRef<AbortController | null>(null);
  const photoSeq = useRef(0);
  const keySeq = useRef(0);
  const makeKey = useCallback(() => "p" + Date.now().toString(36) + (keySeq.current++).toString(36), []);

  const runPhoto = useCallback(
    async (id: number, uri: string) => {
      photoAbort.current?.abort();
      const abort = new AbortController();
      photoAbort.current = abort;
      const set = (p: Partial<PhotoRun>) =>
        setState((s) => (s.photo?.id === id ? { ...s, photo: { ...s.photo, ...p } } : s));
      set({ status: "working" });
      try {
        const r = await recognizeMeal(uri, matcherRef.current, makeKey, abort.signal);
        if (abort.signal.aborted) return;
        set(r.isFood ? { status: "done", items: r.items } : { status: "nofood" });
      } catch (e) {
        if (abort.signal.aborted) return;
        set({ status: e instanceof RecognizeFailure ? e.kind : "failed" });
      } finally {
        if (photoAbort.current === abort) photoAbort.current = null;
        if (RNAppState.currentState === "background") unloadModel();
      }
    },
    [makeKey],
  );

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
          learned: data.learned ?? s.learned,
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
      startPhoto: (src, width, height) => {
        const id = ++photoSeq.current;
        setState((s) => ({ ...s, ov: "photo", photo: { id, uri: src, status: "working", items: [] }, photoPick: null }));
        void (async () => {
          let uri: string;
          try {
            uri = await prepareMealPhoto(src, width, height);
          } catch {
            setState((s) => (s.photo?.id === id ? { ...s, photo: { ...s.photo, status: "failed" } } : s));
            return;
          }
          setState((s) => (s.photo?.id === id ? { ...s, photo: { ...s.photo, uri } } : s));
          await runPhoto(id, uri);
        })();
      },
      retryPhoto: () => {
        const p = stateRef.current.photo;
        if (p) void runPhoto(p.id, p.uri);
      },
      cancelPhoto: () => {
        photoAbort.current?.abort();
        photoAbort.current = null;
        setState((s) => ({ ...s, ov: null, photo: null, photoPick: null, searchMode: "log" }));
      },
      updatePhotoItems: (fn) => {
        setState((s) => (s.photo ? { ...s, photo: { ...s.photo, items: fn(s.photo.items) } } : s));
      },
      photoSuggestions: (key) => {
        const it = stateRef.current.photo?.items.find((i) => i.key === key);
        if (!it?.aiName) return [];
        const byId = new Map(stateRef.current.foods.map((f) => [String(f.id), f]));
        return matcherRef.current.similar(it.aiName, 5).flatMap((id) => byId.get(id) ?? []);
      },
      logPhoto: () => {
        setState((s) => {
          if (!s.photo) return s;
          const entries = photoEntries(s.photo.items, s.foods, s.dayOffset);
          if (!entries.length) return s;
          const k = dayKey(s.dayOffset);
          return {
            ...s,
            logs: { ...s.logs, [k]: [...(s.logs[k] || []), ...entries] },
            learned: learnFromMeal(s.learned, s.photo.items),
            ov: null,
            photo: null,
            photoPick: null,
            searchMode: "log",
          };
        });
      },
    };
  }, [state, hydrated, patch, open, close, runPhoto]);

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
