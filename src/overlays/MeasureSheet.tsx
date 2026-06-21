import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Txt } from "@/components/ui";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";
import type { BodyRecord } from "@/types";

const measDefs: { k: keyof Omit<BodyRecord, "d">; l: string; u: string }[] = [
  { k: "weight", l: "Weight", u: "kg" },
  { k: "waist", l: "Waist", u: "cm" },
  { k: "bicep", l: "Bicep", u: "cm" },
  { k: "chest", l: "Chest", u: "cm" },
  { k: "leg", l: "Leg", u: "cm" },
];

export function MeasureSheet() {
  const { state, patch, close, latestBody, addMeasurement } = useStore();
  const acc = colors.accent;
  const cur = measDefs.find((m) => m.k === state.measureMetric)!;

  return (
    <BottomSheet visible onClose={close} scroll={false}>
      <Txt style={{ fontFamily: font.dB, fontSize: 21, marginBottom: 4 }}>Log measurement</Txt>
      <Txt style={{ fontSize: 12.5, color: colors.muted, fontFamily: font.sb, marginBottom: 18 }}>Adds a new dated body record</Txt>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 18 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 7 }}>
        {measDefs.map((m) => {
          const on = state.measureMetric === m.k;
          return (
            <Pressable
              key={m.k}
              onPress={() => patch({ measureMetric: m.k, measureVal: (latestBody() as any)[m.k] })}
              style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 99, backgroundColor: on ? acc : colors.chip, borderWidth: on ? 0 : 1, borderColor: colors.border5 }}
            >
              <Txt style={{ fontSize: 13, fontFamily: font.b, color: on ? colors.bg : colors.muted }}>{m.l}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingVertical: 22, alignItems: "center", marginBottom: 18 }}>
        <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.b, marginBottom: 10 }}>{`${cur.l} (${cur.u})`}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
          <Pressable onPress={() => patch({ measureVal: +Math.max(0, state.measureVal - 0.5).toFixed(1) })} style={bigBtn}><Txt style={{ fontSize: 26, color: colors.subtle }}>−</Txt></Pressable>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, minWidth: 90, justifyContent: "center" }}>
            <Txt style={{ fontFamily: font.dB, fontSize: 44 }}>{state.measureVal}</Txt>
            <Txt style={{ fontSize: 16, color: colors.muted, fontFamily: font.b }}>{cur.u}</Txt>
          </View>
          <Pressable onPress={() => patch({ measureVal: +(state.measureVal + 0.5).toFixed(1) })} style={bigBtn}><Txt style={{ fontSize: 26, color: colors.subtle }}>+</Txt></Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => { addMeasurement(state.measureMetric, state.measureVal); patch({ ov: null }); }}
        style={{ backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center" }}
      >
        <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>Save measurement</Txt>
      </Pressable>
    </BottomSheet>
  );
}

const bigBtn = { width: 48, height: 48, borderRadius: 99, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center", justifyContent: "center" } as const;
