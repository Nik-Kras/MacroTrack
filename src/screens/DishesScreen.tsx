import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { PlusIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { dishMacros, effectiveCookedWeight, round } from "@/lib/nutrition";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";

export function DishesScreen() {
  const { state, open } = useStore();
  const acc = colors.accent;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 130 }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6, marginBottom: 18 }}>
        <View>
          <Txt style={{ fontSize: 13, color: colors.muted, fontFamily: font.sb }}>Your kitchen</Txt>
          <Txt style={{ fontFamily: font.dB, fontSize: 26, letterSpacing: -0.5 }}>Dishes</Txt>
        </View>
        <Pressable
          onPress={() => open("dishEdit", { dishDraft: { id: null, name: "", servings: 2, emoji: "🍽", photo: "", ing: [] } })}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: acc, borderRadius: 99, paddingVertical: 9, paddingHorizontal: 14 }}
        >
          <PlusIcon size={15} color={colors.bg} width={3} />
          <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 13 }}>New</Txt>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {state.dishes.map((d) => {
          const m = dishMacros(d, state.foods);
          // Open ready to log by weight: servings differ portion to portion, so
          // the sheet starts in cooked-grams mode pre-filled with one serving.
          const oneServing = Math.round(Math.round(effectiveCookedWeight(d.cookedWeight, m.cooked)) / Math.max(1, d.servings));
          return (
            <Pressable
              key={d.id}
              onPress={() => open("dish", { selDish: d.id, dishServings: 1, dishLogMode: "cooked", dishCookedGrams: oneServing })}
              style={{ width: "47.5%", flexGrow: 1, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border3, borderRadius: 20, overflow: "hidden" }}
            >
              <Visual photo={d.photo} name={d.name} emoji={d.emoji || d.glyph || "🍽"} full height={104} radius={0}>
                <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(8,10,13,.5)", borderRadius: 99, paddingVertical: 4, paddingHorizontal: 9 }}>
                  <Txt style={{ fontSize: 11, fontFamily: font.xb }}>{`${round(m.perKcal)} kcal`}</Txt>
                </View>
              </Visual>
              <View style={{ paddingHorizontal: 12, paddingTop: 11, paddingBottom: 13 }}>
                <Txt numberOfLines={1} style={{ fontSize: 14, fontFamily: font.b }}>{d.name}</Txt>
                <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 3 }}>
                  {`${d.servings} servings · ${round(m.perP)}P ${round(m.perC)}C ${round(m.perF)}F`}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
