import React from "react";
import { Pressable, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { findFood, foodEmoji, round, weightLabel, yldOf } from "@/lib/nutrition";
import { pickPhoto } from "@/lib/photo";
import { deleteDish, saveDish } from "@/overlays/editorActions";
import { useSubmitGuard } from "@/lib/useSubmitGuard";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";

export function DishBuilderSheet() {
  const store = useStore();
  const { state, patch, close } = store;
  const guard = useSubmitGuard();
  const acc = colors.accent;
  const DD = state.dishDraft;
  if (!DD) return null;

  const setDD = (k: string, v: any) => patch({ dishDraft: { ...state.dishDraft!, [k]: v } as any });
  const sv = Math.max(1, DD.servings || 1);

  let tk = 0, tp = 0, tc = 0, tf = 0, predCooked = 0;
  const rows = (DD.ing || []).map((ing, idx) => {
    const fo = findFood(state.foods, ing.foodId);
    const r = ing.grams / 100;
    if (fo) { tk += fo.kcal * r; tp += fo.p * r; tc += fo.c * r; tf += fo.f * r; predCooked += ing.grams * yldOf(fo); }
    return { ing, idx, fo };
  });

  const addPhoto = async () => { const uri = await pickPhoto(); if (uri) patch({ dishDraft: { ...store.state.dishDraft!, photo: uri } }); };
  const onSave = () => { saveDish(store); patch({ ov: null, dishDraft: null, screen: "dishes" }); };
  const onDelete = () => { if (DD.id) deleteDish(store, DD.id); patch({ ov: null, dishDraft: null, screen: "dishes" }); };

  return (
    <BottomSheet visible onClose={close}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Txt style={{ fontFamily: font.dB, fontSize: 19 }}>{DD.id ? "Edit dish" : "New dish"}</Txt>
        <Pressable onPress={close}><Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted }}>Close</Txt></Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 13, marginBottom: 16, alignItems: "center" }}>
        <Pressable onPress={addPhoto}>
          <Visual photo={DD.photo} name={DD.name} emoji={DD.emoji || "🍽"} size={64} radius={18} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 6 }}>Dish name</Txt>
          <TextInput value={DD.name} onChangeText={(t) => setDD("name", t)} placeholder="e.g. Chicken bowl" placeholderTextColor={colors.dim} style={{ backgroundColor: colors.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, color: colors.text, fontFamily: font.b, fontSize: 15 }} />
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 18 }}>
        <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>Servings</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={() => setDD("servings", Math.max(1, sv - 1))} style={stepBtn}><Txt style={{ fontSize: 20, color: colors.subtle }}>−</Txt></Pressable>
          <Txt style={{ fontFamily: font.dB, fontSize: 22, minWidth: 28, textAlign: "center" }}>{sv}</Txt>
          <Pressable onPress={() => setDD("servings", sv + 1)} style={stepBtn}><Txt style={{ fontSize: 20, color: colors.subtle }}>+</Txt></Pressable>
        </View>
      </View>

      <Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted, marginBottom: 10 }}>Ingredients</Txt>
      <View style={{ gap: 7, marginBottom: 12 }}>
        {rows.map(({ ing, idx, fo }) => (
          <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card2, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11 }}>
            <Visual photo={fo?.photo} name={fo?.name} emoji={foodEmoji(fo)} size={38} radius={11} />
            <Pressable
              onPress={() => patch({ ov: "grams", gTarget: "ingredient", selFood: ing.foodId, addGrams: ing.grams, addPieces: null, gMode: ing.mode === "cooked" ? "cooked" : "raw", gIngIdx: idx })}
              style={{ flex: 1, minWidth: 0 }}
            >
              <Txt numberOfLines={1} style={{ fontSize: 14, fontFamily: font.b }}>{fo ? fo.name : "(removed)"}</Txt>
              <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>
                {fo ? `${weightLabel(fo, ing.grams, ing.mode)} · ${round(fo.kcal * ing.grams / 100)} kcal` : `${ing.grams} g`}
              </Txt>
            </Pressable>
            <Pressable onPress={() => setDD("ing", state.dishDraft!.ing.filter((_, i) => i !== idx))} style={{ width: 32, height: 32, borderRadius: 99, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center", justifyContent: "center" }}>
              <TrashIcon size={15} color={colors.muted} />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => patch({ ov: "addFood", searchMode: "dish", addCat: "all", addSearch: "" })}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: acc, borderStyle: "dashed", backgroundColor: acc + "12", marginBottom: 18 }}
      >
        <PlusIcon size={16} color={acc} width={2.4} />
        <Txt style={{ fontSize: 13.5, fontFamily: font.b, color: acc }}>Add ingredient</Txt>
      </Pressable>

      {(DD.ing || []).length > 0 && (
        <>
          <View style={{ marginBottom: 18 }}>
            <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 6 }}>Cooked weight (optional)</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13 }}>
              <TextInput
                value={DD.cookedWeight != null && DD.cookedWeight !== "" ? String(DD.cookedWeight) : ""}
                onChangeText={(tx) => setDD("cookedWeight", tx.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholder={`${round(predCooked)} (predicted)`}
                placeholderTextColor={colors.dim}
                style={{ flex: 1, color: colors.text, fontFamily: font.dB, fontSize: 18, padding: 0 }}
              />
              <Txt style={{ fontSize: 14, color: colors.muted, fontFamily: font.b }}>g</Txt>
            </View>
            <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.sb, marginTop: 6 }}>
              Weigh the finished dish so you can log a portion by cooked weight. Captures water absorbed or lost while cooking. Leave blank to use the predicted value.
            </Txt>
          </View>

          <View style={{ backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 18 }}>
            <Txt style={{ fontSize: 13, fontFamily: font.dB, marginBottom: 4 }}>{`${round(tk / sv)} kcal · ${round(tp / sv)}P ${round(tc / sv)}C ${round(tf / sv)}F`}</Txt>
            <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb }}>{`per serving · ${round(tk)} kcal · ${round(tp)}P ${round(tc)}C ${round(tf)}F total`}</Txt>
          </View>
        </>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {DD.id && (
          <Pressable onPress={onDelete} style={{ width: 54, backgroundColor: "#241317", borderWidth: 1, borderColor: "#4a2027", borderRadius: 16, padding: 15, alignItems: "center", justifyContent: "center" }}>
            <TrashIcon />
          </Pressable>
        )}
        <Pressable onPress={guard(onSave)} style={{ flex: 1, backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center" }}>
          <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>{DD.id ? "Save dish" : "Create dish"}</Txt>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const stepBtn = { width: 36, height: 36, borderRadius: 99, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center", justifyContent: "center" } as const;
