import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { TrashIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { MC } from "@/data/seed";
import {
  countable,
  dateForOffset,
  dayKey,
  findDish,
  findFood,
  fmtPieces,
  foodEmoji,
  isCookable,
  logFromFood,
  logPieces,
  parsePieces,
  piecesOnly,
  round,
  scaleMacros,
  shownValues,
  stampIfToday,
  yldOf,
} from "@/lib/nutrition";
import { useStore } from "@/store/store";
import { useSubmitGuard } from "@/lib/useSubmitGuard";
import { colors, font } from "@/theme";
import type { Food, FoodPreset, LogEntry } from "@/types";

const PRESETS = [50, 100, 150, 200, 250];
const PIECE_CHIPS = [0.5, 1, 2, 3, 4];

export function GramsSheet() {
  const { state, patch, close } = useStore();
  const guard = useSubmitGuard();
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

  const presetChips: FoodPreset[] = geFood?.presets?.length ? geFood.presets : PRESETS.map((pv) => ({ g: pv }));

  // The name the entry would carry without a comment (food/dish name).
  const baseName = geFood?.name ?? geVisObj?.name ?? geName;
  // Optional comment shown in the log instead of the food name ("Anything" → "tea with honey").
  const [note, setNote] = useState(gt === "edit" && editLog && editLog.name !== baseName ? editLog.name : "");

  // Pieces: a food entered per item, or with an item weight, can be counted ("2 eggs").
  // One entered per item without its weight is counted in pieces only.
  const canCount = countable(geFood);
  const onlyPcs = piecesOnly(geFood);
  const pieceG = geFood?.pieceG;
  const [unit, setUnit] = useState<"g" | "pcs">(canCount && (onlyPcs || state.addPieces != null) ? "pcs" : "g");
  const [count, setCount] = useState(state.addPieces ? fmtPieces(state.addPieces) : "1");
  const pcs = canCount && unit === "pcs";
  const n = pcs ? parsePieces(count) : null;
  const switchUnit = (u: "g" | "pcs") => {
    if (u === unit || !pieceG) return;
    if (u === "pcs") setCount(gu > 0 ? fmtPieces(Math.max(0.5, Math.round((gu / pieceG) * 2) / 2)) : "1");
    else patch({ addGrams: Math.round((n ?? 1) * pieceG), gMode: "raw" });
    setUnit(u);
  };
  // The entry this amount makes (a food); dishes being edited are scaled below.
  const preview: LogEntry | null = !geFood ? null : pcs ? (n !== null ? logPieces(geFood, n) : null) : logFromFood(geFood, Math.round(gu), gmode);

  const onUncooked = (txt: string) => { const v = parseFloat(txt); patch({ addGrams: isNaN(v) ? 0 : v, gMode: "raw" }); };
  const onCooked = (txt: string) => { const v = parseFloat(txt); patch({ addGrams: isNaN(v) ? 0 : v / geY, gMode: "cooked" }); };
  const setPreset = (pv: number) => { const ug = gmode === "cooked" ? pv / geY : pv; patch({ addGrams: ug }); };

  const confirm = () => {
    const k = dayKey(state.dayOffset);
    if (gt === "edit" && editLog && geFood && preview) {
      const { grams, mode, kcal, p, c, f, pieces } = preview;
      const logs = { ...state.logs };
      logs[k] = (logs[k] || []).map((l) =>
        l.id === state.editId ? { ...l, name: note.trim() || baseName, grams, mode: geCookable ? mode : l.mode, kcal, p, c, f, pieces } : l,
      );
      patch({ logs, ov: null, editId: null });
    } else if (gt === "edit" && editLog && gePer100) {
      const rr = (state.addGrams || 0) / 100;
      const logs = { ...state.logs };
      logs[k] = (logs[k] || []).map((l) =>
        l.id === state.editId
          ? { ...l, name: note.trim() || baseName, grams: Math.round(state.addGrams), mode: geCookable ? gmode : l.mode, kcal: round(gePer100!.kcal * rr), p: +(gePer100!.p * rr).toFixed(1), c: +(gePer100!.c * rr).toFixed(1), f: +(gePer100!.f * rr).toFixed(1) }
          : l,
      );
      patch({ logs, ov: null, editId: null });
    } else if (gt === "ingredient" && state.dishDraft && state.selFood != null && preview) {
      // Dishes are weighed: pieces go in as their grams.
      const dd = state.dishDraft;
      const ing = [...(dd.ing || [])];
      ing[state.gIngIdx!] = { foodId: state.selFood, grams: preview.grams, mode: pcs ? "raw" : gmode };
      patch({ dishDraft: { ...dd, ing }, ov: "dishEdit", selFood: null, gIngIdx: null });
    } else if (geFood && preview) {
      const item = stampIfToday(preview, state.dayOffset);
      if (note.trim()) item.name = note.trim();
      // Remember grams or pieces, so the food opens the same way next time.
      const foods = canCount && !onlyPcs && geFood.unit !== unit ? state.foods.map((f) => (f.id === geFood!.id ? { ...f, unit } : f)) : state.foods;
      patch({ logs: { ...state.logs, [k]: [...(state.logs[k] || []), item] }, foods, ov: null, selFood: null });
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

  const shown = geFood ? preview ?? { kcal: 0, p: 0, c: 0, f: 0 } : gePer100 ? scaleMacros(gePer100, ger) : null;
  const macros = shown
    ? [
        { label: "KCAL", value: round(shown.kcal), color: acc },
        { label: "PROTEIN", value: round(shown.p), color: MC.p },
        { label: "CARBS", value: round(shown.c), color: MC.c },
        { label: "FAT", value: round(shown.f), color: MC.f },
      ]
    : [];

  const confirmLabel = gt === "edit" ? "Save" : gt === "ingredient" ? "Set amount" : `Add to ${dateWord}`;
  // Block submitting an empty / zero amount (would create a 0 g, 0-kcal entry).
  const canConfirm = pcs ? n !== null : Math.round(state.addGrams || 0) > 0;

  // "450 kcal / pc · 1 pc = 180 g" for a food entered per item, else per 100 g.
  const sv = geFood ? shownValues(geFood) : null;
  const subtitle = sv
    ? `${round(sv.m.kcal)} kcal / ${sv.per === "pc" ? "pc" : "100 g"}${geCookable && sv.per === "100g" ? " uncooked" : ""}${pieceG ? ` · 1 pc = ${fmtPieces(pieceG)} g` : ""}`
    : gePer100 ? `${round(gePer100.kcal)} kcal / 100 g` : "";

  const numBox = (border: string): any => ({ flex: 1, backgroundColor: colors.inset, borderWidth: 2, borderColor: border, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 13 });

  return (
    <BottomSheet visible onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 13, marginBottom: 18 }}>
        <Visual photo={geVisObj?.photo} name={geName} emoji={geEmoji} size={52} radius={15} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 17, fontFamily: font.dB }}>{geName}</Txt>
          <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.sb }}>
            {subtitle}
          </Txt>
        </View>
      </View>

      {canCount && !onlyPcs && (
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", alignSelf: "flex-start", gap: 4, padding: 4, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, borderRadius: 13, marginBottom: 10 }}>
          {(["g", "pcs"] as const).map((u) => (
            <Pressable key={u} accessibilityRole="radio" accessibilityState={{ checked: unit === u }} accessibilityLabel={u === "g" ? "Grams" : "Pieces"} onPress={() => switchUnit(u)} style={{ paddingVertical: 7, paddingHorizontal: 18, borderRadius: 9, backgroundColor: unit === u ? acc : "transparent" }}>
              <Txt style={{ fontSize: 13, fontFamily: font.b, color: unit === u ? colors.bg : colors.muted }}>{u}</Txt>
            </Pressable>
          ))}
        </View>
      )}

      {pcs ? (
        <View style={{ backgroundColor: colors.inset, borderWidth: 2, borderColor: acc, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 14 }}>
          <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 4 }}>PIECES</Txt>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
            <TextInput value={count} onChangeText={(t) => setCount(t.replace(/[^0-9.,]/g, ""))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.dim} style={{ flex: 1, color: colors.text, fontFamily: font.dB, fontSize: 30, padding: 0 }} />
            <Txt style={{ fontSize: 16, color: colors.muted, fontFamily: font.b }}>{n === 1 ? "pc" : "pcs"}</Txt>
            {preview && pieceG ? <Txt style={{ fontSize: 14, color: colors.dim, fontFamily: font.sb, marginLeft: 8 }}>{`= ${preview.grams} g`}</Txt> : null}
          </View>
        </View>
      ) : geCookable ? (
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
        {pcs && PIECE_CHIPS.map((v) => (
          <Pressable key={v} onPress={() => setCount(String(v))} accessibilityLabel={`${fmtPieces(v)} ${v === 1 ? "piece" : "pieces"}`} style={{ flexGrow: 1, minWidth: 56, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center" }}>
            <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: colors.subtle }}>{v === 0.5 ? "½" : String(v)}</Txt>
          </Pressable>
        ))}
        {!pcs && presetChips.map((pr, i) => (
          <Pressable key={i} onPress={() => setPreset(pr.g)} style={{ flexGrow: 1, minWidth: 56, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center" }}>
            {pr.name ? (
              <>
                <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: colors.subtle }}>{pr.name}</Txt>
                <Txt style={{ fontSize: 10.5, fontFamily: font.sb, color: colors.dim, marginTop: 1 }}>{`${pr.g} g`}</Txt>
              </>
            ) : (
              <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: colors.subtle }}>{pr.g}</Txt>
            )}
          </Pressable>
        ))}
      </View>

      {gt !== "ingredient" && (
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={`Comment (optional) — shows in the log, e.g. "tea with honey"`}
          placeholderTextColor={colors.dim}
          style={{ backgroundColor: colors.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, color: colors.text, fontFamily: font.b, fontSize: 13.5, marginBottom: 18 }}
        />
      )}

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
        <Pressable
          onPress={guard(confirm)}
          disabled={!canConfirm}
          style={{ flex: 1, backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center", opacity: canConfirm ? 1 : 0.4 }}
        >
          <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>{confirmLabel}</Txt>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
