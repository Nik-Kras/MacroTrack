import React from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { TrashIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { CATMETA, EMOJIS } from "@/data/seed";
import { pickPhoto } from "@/lib/photo";
import { deleteFood, saveFood } from "@/overlays/editorActions";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";

export function FoodEditorSheet() {
  const store = useStore();
  const { state, patch } = store;
  const acc = colors.accent;
  const FD = state.foodDraft;
  if (!FD) return null;

  const setFD = (k: string, v: any) => patch({ foodDraft: { ...state.foodDraft!, [k]: v } as any });
  const autoK = Math.round((+FD.p || 0) * 4 + (+FD.c || 0) * 4 + (+FD.f || 0) * 9);
  const kcalValue = FD.kcalManual ? FD.kcal : autoK;

  const close = () => patch({ ov: "addFood", foodDraft: null });
  const onSave = () => {
    const saved = saveFood(store);
    if (FD.fromDish) {
      const d = state.dishDraft || { id: null, name: "", servings: 2, emoji: "🍽", photo: "", ing: [] };
      patch({ dishDraft: { ...d, ing: [...d.ing, { foodId: saved.id, grams: 100, mode: "raw" }] }, ov: "dishEdit", searchMode: "log", foodDraft: null });
    } else {
      patch({ ov: "addFood", foodDraft: null });
    }
  };
  const onDelete = () => { if (FD.id != null) deleteFood(store, FD.id); patch({ ov: "addFood", foodDraft: null }); };
  const addPhoto = async () => { const uri = await pickPhoto(); if (uri) patch({ foodDraft: { ...store.state.foodDraft!, photo: uri } }); };

  const numField = (label: string, value: any, onChange: (t: string) => void, color: string) => (
    <View style={{ flex: 1, backgroundColor: colors.inset, borderRadius: 13, paddingVertical: 10, paddingHorizontal: 12 }}>
      <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 4 }}>{label}</Txt>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <TextInput value={String(value)} onChangeText={onChange} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.dim} style={{ flex: 1, color, fontFamily: font.dB, fontSize: 20, padding: 0 }} />
        <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.b }}>g</Txt>
      </View>
    </View>
  );

  return (
    <BottomSheet visible onClose={close}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Txt style={{ fontFamily: font.dB, fontSize: 19 }}>{FD.id ? "Edit food" : "New custom food"}</Txt>
        <Pressable onPress={close}><Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted }}>Close</Txt></Pressable>
      </View>

      {/* visual + name */}
      <View style={{ flexDirection: "row", gap: 13, marginBottom: 16, alignItems: "center" }}>
        <Pressable onPress={addPhoto}>
          <Visual photo={FD.photo} name={FD.name} emoji={FD.emoji || "🍽"} size={64} radius={18} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 6 }}>Name</Txt>
          <TextInput value={FD.name} onChangeText={(t) => setFD("name", t)} placeholder="e.g. Protein bar" placeholderTextColor={colors.dim} style={{ backgroundColor: colors.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, color: colors.text, fontFamily: font.b, fontSize: 15 }} />
        </View>
      </View>

      {/* emoji picker */}
      <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 8 }}>Icon</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 18 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {EMOJIS.map((em) => {
          const on = FD.emoji === em && !FD.photo;
          return (
            <Pressable key={em} onPress={() => patch({ foodDraft: { ...state.foodDraft!, emoji: em, photo: "" } })} style={{ width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: on ? acc + "26" : colors.chip, borderWidth: on ? 1.5 : 1, borderColor: on ? acc : colors.border5 }}>
              <Txt style={{ fontSize: 22 }}>{em}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* macros */}
      <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 8 }}>Macros / 100 g</Txt>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {numField("PROTEIN", FD.p, (t) => setFD("p", t), MCColor("p"))}
        {numField("CARBS", FD.c, (t) => setFD("c", t), MCColor("c"))}
        {numField("FAT", FD.f, (t) => setFD("f", t), MCColor("f"))}
      </View>

      {/* kcal */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.inset, borderRadius: 13, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 18 }}>
        <View>
          <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b }}>Calories</Txt>
          {FD.kcalManual ? (
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
              <TextInput value={String(FD.kcal)} onChangeText={(t) => setFD("kcal", t)} keyboardType="numeric" style={{ color: acc, fontFamily: font.dB, fontSize: 22, padding: 0, minWidth: 60 }} />
              <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.b }}>kcal</Txt>
            </View>
          ) : (
            <Txt style={{ fontFamily: font.dB, fontSize: 22, color: acc }}>
              {kcalValue}
              <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.b }}> kcal</Txt>
            </Txt>
          )}
        </View>
        <Pressable onPress={() => setFD("kcalManual", !FD.kcalManual)} style={{ backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14 }}>
          <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: colors.subtle }}>{FD.kcalManual ? "Auto" : "Manual"}</Txt>
        </Pressable>
      </View>

      {/* categories */}
      <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 8 }}>Categories</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 18 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 7 }}>
        {CATMETA.map((cm) => {
          const on = FD.cats.includes(cm.key);
          return (
            <Pressable key={cm.key} onPress={() => setFD("cats", on ? FD.cats.filter((x) => x !== cm.key) : [...FD.cats, cm.key])} style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 99, backgroundColor: on ? cm.color + "26" : colors.chip, borderWidth: on ? 1.5 : 1, borderColor: on ? cm.color : colors.border5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: cm.color }} />
              <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: on ? colors.text : colors.muted }}>{cm.label}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* cookable */}
      <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.b, marginBottom: 8 }}>Changes weight when cooked?</Txt>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: FD.cookable ? 10 : 22 }}>
        <Pressable onPress={() => setFD("cookable", true)} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", backgroundColor: FD.cookable ? acc : colors.chip, borderWidth: FD.cookable ? 0 : 1, borderColor: colors.border5 }}>
          <Txt style={{ fontSize: 13, fontFamily: font.b, color: FD.cookable ? colors.bg : colors.muted }}>Yes</Txt>
        </Pressable>
        <Pressable onPress={() => setFD("cookable", false)} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", backgroundColor: !FD.cookable ? acc : colors.chip, borderWidth: !FD.cookable ? 0 : 1, borderColor: colors.border5 }}>
          <Txt style={{ fontSize: 13, fontFamily: font.b, color: !FD.cookable ? colors.bg : colors.muted }}>No</Txt>
        </Pressable>
      </View>
      {FD.cookable && (
        <View style={{ marginBottom: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.b }}>Yield (cooked g per raw g)</Txt>
          </View>
          <TextInput value={String(FD.yld)} onChangeText={(t) => setFD("yld", t)} keyboardType="numeric" style={{ backgroundColor: colors.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, color: colors.text, fontFamily: font.dB, fontSize: 16 }} />
          <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.sb, marginTop: 6 }}>
            {`100 g uncooked = ${Math.round((parseFloat(String(FD.yld)) || 1) * 100)} g cooked`}
          </Txt>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {FD.custom && FD.id != null && (
          <Pressable onPress={onDelete} style={{ width: 54, backgroundColor: "#241317", borderWidth: 1, borderColor: "#4a2027", borderRadius: 16, padding: 15, alignItems: "center", justifyContent: "center" }}>
            <TrashIcon />
          </Pressable>
        )}
        <Pressable onPress={onSave} style={{ flex: 1, backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center" }}>
          <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>{FD.id ? "Save changes" : "Add food"}</Txt>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

function MCColor(k: "p" | "c" | "f") {
  return k === "p" ? colors.protein : k === "c" ? colors.carbs : colors.fat;
}
