import React from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { EditIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { CATMETA } from "@/data/seed";
import { foodEmoji } from "@/lib/nutrition";
import { openFoodEditor } from "@/overlays/editorActions";
import { applyPhotoPick, PhotoButtons } from "@/overlays/PhotoSheet";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";
import type { Food } from "@/types";

export function AddFoodSheet() {
  const store = useStore();
  const { state, patch, open, close } = store;
  const acc = colors.accent;

  const addCatList = [{ key: "all", label: "All" }, ...CATMETA.map((c) => ({ key: c.key, label: c.label }))];
  const q = state.addSearch.trim().toLowerCase();
  let results = state.foods.filter((f) => state.addCat === "all" || f.cats.includes(state.addCat as any));
  if (q) results = state.foods.filter((f) => f.name.toLowerCase().includes(q));

  // Picking a food for a line of a meal photo: suggestions first, and Close goes back to the photo.
  const forPhoto = state.searchMode === "photo";
  const suggested = forPhoto && state.photoPick && !q ? store.photoSuggestions(state.photoPick) : [];
  const shut = forPhoto ? () => patch({ ov: "photo", photoPick: null, searchMode: "log", addSearch: "" }) : close;

  const pick = (f: Food) => {
    if (forPhoto) {
      applyPhotoPick(store, f.id);
    } else if (state.searchMode === "dish") {
      // pick grams first; GramsSheet appends the ingredient at gIngIdx on confirm
      const d = state.dishDraft || { id: null, name: "", servings: 2, emoji: "🍽", photo: "", ing: [] };
      patch({ dishDraft: d, ov: "grams", gTarget: "ingredient", selFood: f.id, addGrams: 100, gMode: "raw", gIngIdx: d.ing.length, searchMode: "log" });
    } else {
      open("grams", { selFood: f.id, addGrams: 100, gTarget: "log", gMode: "raw" });
    }
  };

  return (
    <BottomSheet visible onClose={shut} handle={false} padded={false} scroll={false} fill>
      {/* sticky header */}
      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, flexShrink: 0 }}>
        <View style={{ width: 38, height: 4, borderRadius: 99, backgroundColor: "#333b46", alignSelf: "center", marginBottom: 14 }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Txt style={{ fontFamily: font.dB, fontSize: 19 }}>{forPhoto ? "Pick a food" : "Add food"}</Txt>
          <Pressable onPress={shut}><Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted }}>{forPhoto ? "Back" : "Close"}</Txt></Pressable>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 13 }}>
          <SearchIcon />
          <TextInput
            value={state.addSearch}
            onChangeText={(v) => patch({ addSearch: v })}
            placeholder="Search foods…"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, color: colors.text, fontSize: 15, fontFamily: font.sb, padding: 0 }}
          />
        </View>
        {state.searchMode === "log" && <PhotoButtons />}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 7 }}>
          {addCatList.map((c) => {
            const on = state.addCat === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => patch({ addCat: c.key as any })}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, backgroundColor: on ? acc : colors.chip, borderWidth: on ? 0 : 1, borderColor: colors.border5 }}
              >
                <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: on ? colors.bg : colors.muted }}>{c.label}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* results — flex into the space above the keyboard so the list stays visible while typing */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => openFoodEditor(store, null)}
          style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: colors.border4 }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: acc + "1f", borderWidth: 1.5, borderColor: acc, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
            <PlusIcon size={17} color={acc} width={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontSize: 14, fontFamily: font.b, color: acc }}>Add custom food</Txt>
            <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>Your own item with exact macros</Txt>
          </View>
        </Pressable>

        {suggested.length > 0 && (
          <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.b, marginTop: 12, marginBottom: 2, paddingHorizontal: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Suggested
          </Txt>
        )}
        {suggested.map((f) => (
          <Pressable key={"s" + f.id} onPress={() => pick(f)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: colors.border4 }}>
            <Visual photo={f.photo} name={f.name} emoji={foodEmoji(f)} size={38} radius={11} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={{ fontSize: 14.5, fontFamily: font.b }}>{f.name}</Txt>
              <Txt numberOfLines={1} style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>{`${f.kcal} kcal · P${f.p} C${f.c} F${f.f} /100g`}</Txt>
            </View>
          </Pressable>
        ))}
        {suggested.length > 0 && (
          <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.b, marginTop: 14, marginBottom: 2, paddingHorizontal: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
            All foods
          </Txt>
        )}
        {results.map((f) => (
          <View key={f.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderColor: colors.border4 }}>
            <Pressable onPress={() => pick(f)} style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0, paddingVertical: 11, paddingHorizontal: 4 }}>
              <Visual photo={f.photo} name={f.name} emoji={foodEmoji(f)} size={38} radius={11} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt numberOfLines={1} style={{ fontSize: 14.5, fontFamily: font.b }}>{f.name}</Txt>
                <Txt numberOfLines={1} style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>
                  {`${f.kcal} kcal · P${f.p} C${f.c} F${f.f} /100g${f.custom ? " · Custom" : ""}`}
                </Txt>
              </View>
              <Txt style={{ fontSize: 13, fontFamily: font.xb, color: colors.subtle }}>{f.kcal}</Txt>
            </Pressable>
            <Pressable onPress={() => openFoodEditor(store, f)} style={{ width: 34, height: 34, borderRadius: 99, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center", justifyContent: "center", marginRight: 2 }}>
              <EditIcon />
            </Pressable>
          </View>
        ))}

        {results.length === 0 && (
          <Txt style={{ textAlign: "center", color: colors.dim, paddingVertical: 24, fontSize: 13, fontFamily: font.sb }}>
            {`No foods match "${state.addSearch}" — try Add custom food`}
          </Txt>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
