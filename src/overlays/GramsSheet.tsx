import React from "react";
import { Pressable, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { TrashIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { MC } from "@/data/seed";
import {
  dateForOffset,
  dayKey,
  findDish,
  findFood,
  foodEmoji,
  isCookable,
  logFromFood,
  round,
  yldOf,
} from "@/lib/nutrition";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";
import type { Food } from "@/types";

const PRESETS = [50, 100, 150, 200, 250];

export function GramsSheet() {
  const { state, patch, close } = useStore();
  const acc = colors.accent;
  const dateKey = dayKey(state.dayOffset);
  const { dateWord } = (() => {
    if (state.dayOffset === -1) return { dateWord: "yesterday" };
    if (state.dayOffset === 0) return { dateWord: "today" };
    const d = dateForOffset(state.dayOffset);
    return { dateWord: d.toLocaleDateString("en", { month: "short", day: "numeric" }) };
  })();

  const gt = state.gTarget;
  const editLog = gt === "edit" && state.editId ? (state.logs[dateKey] || []).find((l) => l.id === state.editId) : null;

  let geFood: Food | undefined;
  let gePer100: { kcal: number; p: number; c: number; f: number } | null = null;
  let geVisObj: any = null;
  let geName = "", geCookable = false, geY = 1, geCanDelete = false;

  if (gt === "edit" && editLog) {
    if (editLog.kind === "food") {
      geFood = findFood(state.foods, editLog.foodId);
      if (geFood) { gePer100 = { kcal: geFood.kcal, p: geFood.p, c: geFood.c, f: geFood.f }; geVisObj = geFood; geCookable = isCookable(geFood); geY = yldOf(geFood); }
    } else {
      geVisObj = findDish(state.dishes, editLog.dishId);
      const gg = editLog.grams || 1;
      gePer100 = { kcal: (editLog.kcal / gg) * 100, p: (editLog.p / gg) * 100, c: (editLog.c / gg) * 100, f: (editLog.f / gg) * 100 };
      geCookable = false;
    }
    geName = editLog.name; geCanDelete = true;
  } else if (state.selFood != null) {
    geFood = findFood(state.foods, state.selFood);
    if (geFood) { gePer100 = { kcal: geFood.kcal, p: geFood.p, c: geFood.c, f: geFood.f }; geVisObj = geFood; geName = geFood.name; geCookable = isCookable(geFood); geY = yldOf(geFood); }
  }

  const gu = state.addGrams || 0;
  const ger = gu / 100;
  const gmode = geCookable ? state.gMode || "raw" : "raw";
  const geEmoji = geVisObj ? (geFood ? foodEmoji(geFood) : geVisObj.emoji || geVisObj.glyph || "🍽") : "🍽";

  const onUncooked = (txt: string) => { const v = parseFloat(txt); patch({ addGrams: isNaN(v) ? 0 : v, gMode: "raw" }); };
  const onCooked = (txt: string) => { const v = parseFloat(txt); patch({ addGrams: isNaN(v) ? 0 : v / geY, gMode: "cooked" }); };
  const setPreset = (pv: number) => { const ug = gmode === "cooked" ? pv / geY : pv; patch({ addGrams: ug }); };

  const confirm = () => {
    const k = dayKey(state.dayOffset);
    if (gt === "edit" && editLog && gePer100) {
      const rr = (state.addGrams || 0) / 100;
      const logs = { ...state.logs };
      logs[k] = (logs[k] || []).map((l) =>
        l.id === state.editId
          ? { ...l, grams: Math.round(state.addGrams), mode: geCookable ? gmode : l.mode, kcal: round(gePer100!.kcal * rr), p: +(gePer100!.p * rr).toFixed(1), c: +(gePer100!.c * rr).toFixed(1), f: +(gePer100!.f * rr).toFixed(1) }
          : l,
      );
      patch({ logs, ov: null, editId: null });
    } else if (gt === "ingredient" && state.dishDraft && state.selFood != null) {
      const dd = state.dishDraft;
      const ing = [...(dd.ing || [])];
      ing[state.gIngIdx!] = { foodId: state.selFood, grams: Math.round(state.addGrams), mode: gmode };
      patch({ dishDraft: { ...dd, ing }, ov: "dishEdit", selFood: null, gIngIdx: null });
    } else if (geFood) {
      const item = logFromFood(geFood, Math.round(state.addGrams), gmode);
      patch({ logs: { ...state.logs, [k]: [...(state.logs[k] || []), item] }, ov: null, selFood: null });
    }
  };
  const onClose = () => {
    if (gt === "ingredient") patch({ ov: "dishEdit", selFood: null, gIngIdx: null });
    else if (gt === "edit") close();
    else patch({ ov: "addFood", selFood: null });
  };
  const del = () => {
    const k = dayKey(state.dayOffset);
    const logs = { ...state.logs };
    logs[k] = (logs[k] || []).filter((l) => l.id !== state.editId);
    patch({ logs, ov: null, editId: null });
  };

  const macros = gePer100
    ? [
        { label: "KCAL", value: round(gePer100.kcal * ger), color: acc },
        { label: "PROTEIN", value: round(gePer100.p * ger), color: MC.p },
        { label: "CARBS", value: round(gePer100.c * ger), color: MC.c },
        { label: "FAT", value: round(gePer100.f * ger), color: MC.f },
      ]
    : [];

  const confirmLabel = gt === "edit" ? "Save" : gt === "ingredient" ? "Set amount" : `Add to ${dateWord}`;

  const numBox = (border: string): any => ({ flex: 1, backgroundColor: colors.inset, borderWidth: 2, borderColor: border, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 13 });

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 18 }}>
        <Visual photo={geVisObj?.photo} name={geName} emoji={geEmoji} size={52} radius={15} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 17, fontFamily: font.dB }}>{geName}</Txt>
          <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.sb }}>
            {gePer100 ? `${round(gePer100.kcal)} kcal / 100 g${geCookable ? " uncooked" : ""}` : ""}
          </Txt>
        </View>
      </View>

      {geCookable ? (
        <>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
            <View style={numBox(gmode === "raw" ? acc : colors.border)}>
              <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 4 }}>UNCOOKED</Txt>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
                <TextInput value={gu ? String(Math.round(gu)) : ""} onChangeText={onUncooked} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.dim} style={{ flex: 1, color: colors.text, fontFamily: font.dB, fontSize: 26, padding: 0 }} />
                <Txt style={{ fontSize: 14, color: colors.muted, fontFamily: font.b }}>g</Txt>
              </View>
            </View>
            <View style={numBox(gmode === "cooked" ? acc : colors.border)}>
              <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 4 }}>COOKED</Txt>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
                <TextInput value={geCookable ? String(Math.round(gu * geY)) : ""} onChangeText={onCooked} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.dim} style={{ flex: 1, color: colors.text, fontFamily: font.dB, fontSize: 26, padding: 0 }} />
                <Txt style={{ fontSize: 14, color: colors.muted, fontFamily: font.b }}>g</Txt>
              </View>
            </View>
          </View>
          <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.sb, textAlign: "center", marginBottom: 16 }}>
            {`100 g uncooked = ${round(geY * 100)} g cooked`}
          </Txt>
        </>
      ) : (
        <View style={{ backgroundColor: colors.inset, borderWidth: 2, borderColor: acc, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 14 }}>
          <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 4 }}>WEIGHT</Txt>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
            <TextInput value={gu ? String(Math.round(gu)) : ""} onChangeText={onUncooked} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.dim} style={{ flex: 1, color: colors.text, fontFamily: font.dB, fontSize: 30, padding: 0 }} />
            <Txt style={{ fontSize: 16, color: colors.muted, fontFamily: font.b }}>g</Txt>
          </View>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 7, marginBottom: 18 }}>
        {PRESETS.map((pv) => (
          <Pressable key={pv} onPress={() => setPreset(pv)} style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center" }}>
            <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: colors.subtle }}>{pv}</Txt>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        {macros.map((m) => (
          <View key={m.label} style={{ flex: 1, backgroundColor: colors.inset, borderRadius: 13, padding: 10, alignItems: "center" }}>
            <Txt style={{ fontFamily: font.dB, fontSize: 17, color: m.color }}>{m.value}</Txt>
            <Txt style={{ fontSize: 10, color: colors.muted, fontFamily: font.b, marginTop: 2, letterSpacing: 0.3 }}>{m.label}</Txt>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {geCanDelete && (
          <Pressable onPress={del} style={{ width: 54, backgroundColor: "#241317", borderWidth: 1, borderColor: "#4a2027", borderRadius: 16, padding: 15, alignItems: "center", justifyContent: "center" }}>
            <TrashIcon />
          </Pressable>
        )}
        <Pressable onPress={confirm} style={{ flex: 1, backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center" }}>
          <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>{confirmLabel}</Txt>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
