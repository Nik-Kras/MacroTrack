import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, TextInput, View } from "react-native";

import { LiteRtLm } from "../../modules/litert-lm";
import { BottomSheet } from "@/components/BottomSheet";
import { CameraIcon, GalleryIcon, PlusIcon } from "@/components/icons";
import { ModelDownloadCard } from "@/components/ModelDownloadCard";
import { Txt, Visual } from "@/components/ui";
import { takeMealPhoto } from "@/lib/ai/photo";
import { cleanGrams, entryFor, findById, type PhotoItem } from "@/lib/ai/recognition";
import { isDemo, warmUp } from "@/lib/ai/recognize";
import { foodEmoji } from "@/lib/nutrition";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";

type Store = ReturnType<typeof useStore>;

/** Add food picked a food for a photo line (swap / unknown / new line): apply it and go back. */
export function applyPhotoPick(store: Store, foodId: number | string) {
  const pick = store.state.photoPick;
  const id = String(foodId);
  if (pick === "new") {
    // A line she adds herself starts without a weight: she types what she weighed.
    store.updatePhotoItems((items) => [...items, { key: "p" + Date.now().toString(36), foodId: id, grams: "" }]);
  } else if (pick) {
    store.updatePhotoItems((items) => items.map((it) => (it.key === pick ? { ...it, foodId: id, unknown: false } : it)));
  }
  store.patch({ ov: "photo", photoPick: null, searchMode: "log", addSearch: "" });
}

/** Open Add food to pick a food for a photo line. */
export function pickForPhoto(store: Store, key: string) {
  store.patch({ ov: "addFood", searchMode: "photo", photoPick: key, addSearch: "", addCat: "all" });
}

/** Take or pick a meal photo and start recognising it. */
export async function photoFrom(store: Store, source: "camera" | "library") {
  warmUp(); // load the model while the camera is open
  const p = await takeMealPhoto(source);
  if (p) store.startPhoto(p.uri, p.width, p.height);
}

const SLOW_MS = 15_000;

function Working() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 18 }}>
      <ActivityIndicator size="large" color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Txt style={{ fontFamily: font.dB, fontSize: 17 }}>Looking at your plate…</Txt>
        <Txt style={{ fontSize: 12.5, color: colors.muted, fontFamily: font.sb, marginTop: 3 }}>
          {isDemo() ? "Demo: the emulator has no model, showing a sample" : slow ? "Still looking, almost there…" : "This can take up to a minute."}
        </Txt>
      </View>
    </View>
  );
}

function Line({ item, store }: { item: PhotoItem; store: Store }) {
  const food = findById(store.state.foods, item.foodId);
  const g = parseInt(item.grams || "0", 10);
  const m = food && g > 0 ? entryFor(food, g) : null;
  const set = (p: Partial<PhotoItem>) => store.updatePhotoItems((items) => items.map((it) => (it.key === item.key ? { ...it, ...p } : it)));
  const remove = () => store.updatePhotoItems((items) => items.filter((it) => it.key !== item.key));
  const unknown = !food;
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: unknown ? colors.carbs : colors.border,
        padding: 12,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable
          onPress={() => pickForPhoto(store, item.key)}
          accessibilityLabel={unknown ? `Unknown food ${item.aiName ?? ""}. Pick a food` : `${food!.name}. Change food`}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 }}
        >
          {food ? (
            <Visual photo={food.photo} name={food.name} emoji={foodEmoji(food)} size={34} radius={10} />
          ) : (
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.carbs + "22", alignItems: "center", justifyContent: "center" }}>
              <Txt style={{ fontFamily: font.xb, color: colors.carbs }}>?</Txt>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={{ fontSize: 14.5, fontFamily: font.b }}>
              {food ? food.name : "Unknown — tap to pick"}
            </Txt>
            {item.aiName ? (
              <Txt numberOfLines={1} style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 1 }}>
                {`Seen as "${item.aiName}"`}
              </Txt>
            ) : null}
          </View>
        </Pressable>
        <Pressable onPress={remove} accessibilityLabel="Remove" hitSlop={8} style={{ width: 34, height: 34, borderRadius: 99, backgroundColor: colors.chip, alignItems: "center", justifyContent: "center" }}>
          <Txt style={{ fontSize: 15, color: colors.muted, fontFamily: font.b }}>✕</Txt>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, backgroundColor: colors.inset, borderRadius: 12, borderWidth: 1, borderColor: g > 0 ? colors.border5 : colors.carbs, paddingHorizontal: 12, paddingVertical: 8, minWidth: 110 }}>
          <TextInput
            value={item.grams}
            onChangeText={(t) => set({ grams: cleanGrams(t) })}
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder="0"
            placeholderTextColor={colors.dim}
            selectTextOnFocus
            accessibilityLabel={food ? `Grams of ${food.name}` : "Grams"}
            style={{ color: colors.text, fontFamily: font.dB, fontSize: 19, padding: 0, minWidth: 44 }}
          />
          <Txt style={{ color: colors.muted, fontSize: 12.5, fontFamily: font.b }}>{food?.cookable ? "g cooked" : "g"}</Txt>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Txt style={{ fontFamily: font.dB, fontSize: 17 }}>{m ? `${m.kcal} kcal` : "— kcal"}</Txt>
          {m ? (
            <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb }}>{`P${m.p} C${m.c} F${m.f}`}</Txt>
          ) : (
            <Txt style={{ fontSize: 11.5, color: colors.carbs, fontFamily: font.sb }}>{unknown ? "pick a food" : "enter grams"}</Txt>
          )}
        </View>
      </View>
    </View>
  );
}

/** The meal photo: recognising, then the review list that logs it as one meal. */
export function PhotoSheet() {
  const store = useStore();
  const { state } = store;
  const run = state.photo;
  if (!run) return null;
  const items = run.items;
  const lines = items.map((it) => {
    const food = findById(state.foods, it.foodId);
    const g = parseInt(it.grams || "0", 10);
    return { it, food, g, e: food && g > 0 ? entryFor(food, g) : null };
  });
  const total = lines.reduce((a, l) => ({ kcal: a.kcal + (l.e?.kcal ?? 0), p: a.p + (l.e?.p ?? 0), c: a.c + (l.e?.c ?? 0), f: a.f + (l.e?.f ?? 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
  const unknown = lines.filter((l) => !l.food);
  const noWeight = lines.filter((l) => l.food && !(l.g > 0));

  // Back or Close on a recognised photo asks first: the model's work isn't thrown away by accident.
  const close = () => {
    if (run.status !== "done" || items.length === 0) return store.cancelPhoto();
    Alert.alert("Discard this photo?", "The foods found in it won't be logged.", [
      { text: "Keep", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: store.cancelPhoto },
    ]);
  };

  const action =
    unknown.length > 0
      ? { label: unknown.length === 1 ? "Pick a food for 1 line" : `Pick foods for ${unknown.length} lines`, run: () => pickForPhoto(store, unknown[0].it.key), on: true }
      : noWeight.length > 0
        ? { label: "Enter the grams", run: () => {}, on: false }
        : items.length === 0
          ? { label: "Add a food", run: () => pickForPhoto(store, "new"), on: true }
          : { label: `Log meal · ${total.kcal} kcal`, run: store.logPhoto, on: true };

  const manual = () => {
    store.cancelPhoto();
    store.open("addFood", { addCat: "all", addSearch: "", searchMode: "log" });
  };
  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={{ backgroundColor: primary ? colors.accent : colors.chip, borderWidth: primary ? 0 : 1, borderColor: colors.border5, borderRadius: 14, paddingVertical: 13, alignItems: "center" }}
    >
      <Txt style={{ fontFamily: font.xb, fontSize: 14.5, color: primary ? colors.bg : colors.text }}>{label}</Txt>
    </Pressable>
  );

  return (
    <BottomSheet visible onClose={close} handle={false} padded={false} scroll={false} fill>
      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, flexShrink: 0 }}>
        <View style={{ width: 38, height: 4, borderRadius: 99, backgroundColor: "#333b46", alignSelf: "center", marginBottom: 14 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image source={{ uri: run.uri }} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.inset }} accessibilityLabel="Meal photo" />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: font.dB, fontSize: 19 }}>Photo</Txt>
            <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>
              {run.status === "done" ? "Weights are estimates — check them" : "Food recognition runs on your phone"}
            </Txt>
          </View>
          <Pressable onPress={close}>
            <Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted }}>Close</Txt>
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18, gap: 10 }} keyboardShouldPersistTaps="handled">
        {run.status === "working" && <Working />}

        {run.status === "nomodel" && (
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
            <ModelDownloadCard onReady={store.retryPhoto} />
          </View>
        )}

        {(run.status === "nofood" || run.status === "failed") && (
          <View style={{ gap: 10, paddingVertical: 6 }}>
            <Txt style={{ fontFamily: font.dB, fontSize: 17 }}>{run.status === "nofood" ? "No food found in this photo" : "Couldn't recognise this photo"}</Txt>
            <Txt style={{ fontSize: 13, color: colors.muted, fontFamily: font.sb, lineHeight: 19 }}>
              {run.status === "nofood" ? "Take it closer and from above, or add the foods yourself." : "Try again, take another photo, or add the foods yourself."}
            </Txt>
            {button("Take another photo", () => void photoFrom(store, "camera"), true)}
            {run.status === "failed" && button("Try again", store.retryPhoto)}
            {button("Add food manually", manual)}
          </View>
        )}

        {run.status === "done" && (
          <>
            {items.map((it) => (
              <Line key={it.key} item={it} store={store} />
            ))}
            <Pressable
              onPress={() => pickForPhoto(store, "new")}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.accent + "88" }}
            >
              <PlusIcon size={16} color={colors.accent} width={2.4} />
              <Txt style={{ fontFamily: font.b, fontSize: 14, color: colors.accent }}>Add food</Txt>
            </Pressable>
          </>
        )}
      </ScrollView>

      {run.status === "done" && (
        <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, borderTopWidth: 1, borderColor: colors.border4, gap: 8, flexShrink: 0 }}>
          <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.sb, textAlign: "center" }}>
            {`P ${Math.round(total.p)} g · C ${Math.round(total.c)} g · F ${Math.round(total.f)} g`}
          </Txt>
          <Pressable
            onPress={action.run}
            disabled={!action.on}
            style={{ backgroundColor: action.on ? colors.accent : colors.chip, borderRadius: 16, paddingVertical: 15, alignItems: "center" }}
          >
            <Txt style={{ fontFamily: font.xb, fontSize: 15.5, color: action.on ? colors.bg : colors.muted }}>{action.label}</Txt>
          </Pressable>
        </View>
      )}
    </BottomSheet>
  );
}

/** The camera and gallery buttons in Add food (hidden where the model can't run: iOS, Expo Go release). */
export function PhotoButtons() {
  const store = useStore();
  if (!LiteRtLm && !__DEV__) return null;
  const btn = (Icon: typeof CameraIcon, label: string, source: "camera" | "library") => (
    <Pressable
      onPress={() => void photoFrom(store, source)}
      accessibilityLabel={label}
      style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center", justifyContent: "center" }}
    >
      <Icon size={21} color={colors.accent} />
    </Pressable>
  );
  return (
    <>
      {btn(CameraIcon, "Photo of a meal", "camera")}
      {btn(GalleryIcon, "Meal photo from gallery", "library")}
    </>
  );
}
