import React from "react";
import { Pressable, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { EditIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { MC } from "@/data/seed";
import { catColor, dateForOffset, dayKey, dishMacros, findFood, isCookable, round, toCooked } from "@/lib/nutrition";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";
import type { LogEntry } from "@/types";

export function DishSheet() {
  const { state, patch, open, close } = useStore();
  const acc = colors.accent;
  const d = state.dishes.find((x) => x.id === state.selDish);
  if (!d) return null;

  const m = dishMacros(d, state.foods);
  const sv = state.dishServings;
  const dateWord = state.dayOffset === 0 ? "today" : state.dayOffset === -1 ? "yesterday" : dateForOffset(state.dayOffset).toLocaleDateString("en", { month: "short", day: "numeric" });

  const macros = [
    { label: "KCAL", value: round(m.perKcal * sv), color: acc },
    { label: "PROTEIN", value: round(m.perP * sv), color: MC.p },
    { label: "CARBS", value: round(m.perC * sv), color: MC.c },
    { label: "FAT", value: round(m.perF * sv), color: MC.f },
  ];

  const useDish = () => {
    const item: LogEntry = {
      id: "l" + Math.random().toString(36).slice(2, 8),
      kind: "dish",
      dishId: d.id,
      name: d.name + (sv > 1 ? ` ×${sv}` : ""),
      grams: round((m.grams / d.servings) * sv),
      mode: "na",
      kcal: round(m.perKcal * sv),
      p: +(m.perP * sv).toFixed(1),
      c: +(m.perC * sv).toFixed(1),
      f: +(m.perF * sv).toFixed(1),
      cat: "protein",
    };
    const k = dayKey(state.dayOffset);
    patch({ logs: { ...state.logs, [k]: [...(state.logs[k] || []), item] }, ov: null, selDish: null, screen: "nutrition" });
  };

  const editDish = () =>
    open("dishEdit", { dishDraft: { id: d.id, name: d.name, servings: d.servings, emoji: d.emoji || d.glyph || "🍽", photo: d.photo || "", ing: d.ing.map(([id, gr]) => ({ foodId: id, grams: gr, mode: "raw" })) } });

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
              {`Recipe makes ${d.servings} servings · ${round(m.grams)} g total`}
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
          {`for ${sv} serving${sv > 1 ? "s" : ""} (per serving: ${round(m.perKcal)} kcal)`}
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>Servings to log</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Pressable onPress={() => patch({ dishServings: Math.max(1, sv - 1) })} style={stepBtn}><Txt style={{ fontSize: 20, color: colors.subtle }}>−</Txt></Pressable>
              <Txt style={{ fontFamily: font.dB, fontSize: 22, minWidth: 30, textAlign: "center" }}>{sv}</Txt>
              <Pressable onPress={() => patch({ dishServings: sv + 1 })} style={stepBtn}><Txt style={{ fontSize: 20, color: colors.subtle }}>+</Txt></Pressable>
            </View>
          </View>
        </View>

        <Pressable onPress={useDish} style={{ backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center" }}>
          <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>{`Use · add to ${dateWord}`}</Txt>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const stepBtn = { width: 36, height: 36, borderRadius: 99, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center", justifyContent: "center" } as const;
