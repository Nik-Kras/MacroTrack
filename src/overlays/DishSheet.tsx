import React from "react";
import { Pressable, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { EditIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { MC } from "@/data/seed";
import { catColor, dateForOffset, dayKey, dishMacros, effectiveCookedWeight, findFood, isCookable, macrosForCookedGrams, round, stampIfToday, toCooked } from "@/lib/nutrition";
import { useSubmitGuard } from "@/lib/useSubmitGuard";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";
import type { LogEntry } from "@/types";

export function DishSheet() {
  const { state, patch, open, close } = useStore();
  const guard = useSubmitGuard();
  const acc = colors.accent;
  const d = state.dishes.find((x) => x.id === state.selDish);
  if (!d) return null;

  const m = dishMacros(d, state.foods);
  const sv = state.dishServings;
  const mode = state.dishLogMode;
  // Round once so the divisor matches the displayed total and the quick-fill chips.
  const cookedTotal = Math.round(effectiveCookedWeight(d.cookedWeight, m.cooked));
  const cg = state.dishCookedGrams || 0;
  const dateWord = state.dayOffset === 0 ? "today" : state.dayOffset === -1 ? "yesterday" : dateForOffset(state.dayOffset).toLocaleDateString("en", { month: "short", day: "numeric" });

  // Macros for the currently selected logging mode.
  const active =
    mode === "cooked"
      ? macrosForCookedGrams(m, cookedTotal, cg)
      : { kcal: m.perKcal * sv, p: m.perP * sv, c: m.perC * sv, f: m.perF * sv };

  const macros = [
    { label: "KCAL", value: round(active.kcal), color: acc },
    { label: "PROTEIN", value: round(active.p), color: MC.p },
    { label: "CARBS", value: round(active.c), color: MC.c },
    { label: "FAT", value: round(active.f), color: MC.f },
  ];

  const setMode = (mm: "servings" | "cooked") => {
    if (mm === "cooked" && cg <= 0) {
      patch({ dishLogMode: mm, dishCookedGrams: Math.round(cookedTotal / Math.max(1, d.servings)) });
    } else {
      patch({ dishLogMode: mm });
    }
  };

  const useDish = () => {
    const isCooked = mode === "cooked";
    const item: LogEntry = {
      id: "l" + Math.random().toString(36).slice(2, 8),
      kind: "dish",
      dishId: d.id,
      name: isCooked ? `${d.name} · ${Math.round(cg)} g` : d.name + (sv > 1 ? ` ×${sv}` : ""),
      grams: isCooked ? Math.round(cg) : round((m.grams / d.servings) * sv),
      mode: isCooked ? "cooked" : "na",
      kcal: round(active.kcal),
      p: +active.p.toFixed(1),
      c: +active.c.toFixed(1),
      f: +active.f.toFixed(1),
      cat: "protein",
    };
    const k = dayKey(state.dayOffset);
    patch({ logs: { ...state.logs, [k]: [...(state.logs[k] || []), stampIfToday(item, state.dayOffset)] }, ov: null, selDish: null, screen: "nutrition" });
  };

  // In cooked-weight mode a 0 g entry is meaningless; servings mode is always ≥ 1.
  const canUse = mode === "cooked" ? Math.round(cg) > 0 : true;

  const editDish = () =>
    open("dishEdit", { dishDraft: { id: d.id, name: d.name, servings: d.servings, emoji: d.emoji || d.glyph || "🍽", photo: d.photo || "", cookedWeight: d.cookedWeight ?? "", ing: d.ing.map(([id, gr]) => ({ foodId: id, grams: gr, mode: "raw" as const })) } });

  return (
    <BottomSheet visible onClose={close} handle={false} padded={false} maxHeightPct={0.92}>
      <Visual photo={d.photo} name={d.name} emoji={d.emoji || d.glyph || "🍽"} full height={170} radius={0}>
        <Pressable onPress={close} style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: 99, backgroundColor: "rgba(8,10,13,.55)", alignItems: "center", justifyContent: "center" }}>
          <Txt style={{ fontSize: 16, color: "#fff" }}>✕</Txt>
        </Pressable>
      </Visual>

      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: font.dB, fontSize: 23 }}>{d.name}</Txt>
            <Txt style={{ fontSize: 12.5, color: colors.muted, fontFamily: font.sb, marginTop: 3, marginBottom: 16 }}>
              {`${d.servings} servings · ${round(m.grams)} g raw → ${round(cookedTotal)} g cooked`}
            </Txt>
          </View>
          <Pressable onPress={editDish} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 13 }}>
            <EditIcon size={13} color={colors.subtle} />
            <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: colors.subtle }}>Edit</Txt>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
          {macros.map((mm) => (
            <View key={mm.label} style={{ flex: 1, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border3, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 8, alignItems: "center" }}>
              <Txt style={{ fontFamily: font.dB, fontSize: 18, color: mm.color }}>{mm.value}</Txt>
              <Txt style={{ fontSize: 10, color: colors.muted, fontFamily: font.b, marginTop: 2 }}>{mm.label}</Txt>
            </View>
          ))}
        </View>
        <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.b, textAlign: "center", marginBottom: 18 }}>
          {mode === "cooked"
            ? `${Math.round(cg)} g of ${round(cookedTotal)} g cooked total`
            : `for ${sv} serving${sv > 1 ? "s" : ""} · per serving ${round(m.perKcal)} kcal`}
        </Txt>

        <Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted, marginBottom: 10 }}>Ingredients</Txt>
        <View style={{ gap: 7, marginBottom: 22 }}>
          {d.ing.map(([id, gr], i) => {
            const fo = findFood(state.foods, id);
            const grams = fo && isCookable(fo) ? `${gr} g → ${round(toCooked(fo, gr))} g` : `${gr} g`;
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card2, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: catColor(fo ? fo.cats[0] : "") }} />
                  <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>{fo ? fo.name : "(removed)"}</Txt>
                </View>
                <Txt style={{ fontSize: 13, color: colors.muted, fontFamily: font.b }}>{grams}</Txt>
              </View>
            );
          })}
        </View>

        <View style={{ backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16 }}>
          {/* mode toggle */}
          <View style={{ flexDirection: "row", backgroundColor: colors.bg, borderRadius: 99, padding: 4, marginBottom: 14 }}>
            {(["servings", "cooked"] as const).map((mm) => {
              const on = mode === mm;
              return (
                <Pressable key={mm} onPress={() => setMode(mm)} style={{ flex: 1, paddingVertical: 8, borderRadius: 99, backgroundColor: on ? acc : "transparent", alignItems: "center" }}>
                  <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: on ? colors.bg : colors.muted }}>{mm === "servings" ? "Servings" : "Cooked weight"}</Txt>
                </Pressable>
              );
            })}
          </View>

          {mode === "servings" ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>Servings to log</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Pressable onPress={() => patch({ dishServings: Math.max(1, sv - 1) })} style={stepBtn}><Txt style={{ fontSize: 20, color: colors.subtle }}>−</Txt></Pressable>
                <Txt style={{ fontFamily: font.dB, fontSize: 22, minWidth: 30, textAlign: "center" }}>{sv}</Txt>
                <Pressable onPress={() => patch({ dishServings: sv + 1 })} style={stepBtn}><Txt style={{ fontSize: 20, color: colors.subtle }}>+</Txt></Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>Cooked grams to log</Txt>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3, backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, minWidth: 110 }}>
                  <TextInput
                    value={cg ? String(Math.round(cg)) : ""}
                    onChangeText={(tx) => patch({ dishCookedGrams: parseInt(tx.replace(/[^0-9]/g, ""), 10) || 0 })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.dim}
                    style={{ flex: 1, color: colors.text, fontFamily: font.dB, fontSize: 22, padding: 0, textAlign: "right" }}
                  />
                  <Txt style={{ fontSize: 14, color: colors.muted, fontFamily: font.b }}>g</Txt>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 7, marginTop: 12 }}>
                {[
                  { label: "1 serving", val: Math.round(cookedTotal / Math.max(1, d.servings)) },
                  { label: "½ dish", val: Math.round(cookedTotal / 2) },
                  { label: "Whole dish", val: Math.round(cookedTotal) },
                ].map((q) => (
                  <Pressable key={q.label} onPress={() => patch({ dishCookedGrams: q.val })} style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center" }}>
                    <Txt style={{ fontSize: 11.5, fontFamily: font.b, color: colors.subtle }}>{q.label}</Txt>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>

        <Pressable
          onPress={guard(useDish)}
          disabled={!canUse}
          style={{ backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center", opacity: canUse ? 1 : 0.4 }}
        >
          <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>{`Use · add to ${dateWord}`}</Txt>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const stepBtn = { width: 36, height: 36, borderRadius: 99, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center", justifyContent: "center" } as const;
