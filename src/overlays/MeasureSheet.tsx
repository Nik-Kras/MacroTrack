import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Txt } from "@/components/ui";
import { METRICS, defaultMetricValue } from "@/lib/body";
import { useSubmitGuard } from "@/lib/useSubmitGuard";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";

export function MeasureSheet() {
  const { state, patch, close, addMeasurement } = useStore();
  const guard = useSubmitGuard();
  const acc = colors.accent;
  const cur = METRICS.find((m) => m.key === state.measureMetric)!;

  return (
    <BottomSheet visible onClose={close} scroll={false}>
      <Txt style={{ fontFamily: font.dB, fontSize: 21, marginBottom: 4 }}>Log measurement</Txt>
      <Txt style={{ fontSize: 12.5, color: colors.muted, fontFamily: font.sb, marginBottom: 18 }}>Saves a dated entry for today</Txt>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginBottom: 18 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 7 }}>
        {METRICS.map((m) => {
          const on = state.measureMetric === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => patch({ measureMetric: m.key, measureVal: defaultMetricValue(state.measurements, m.key, state.profile) })}
              style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 99, backgroundColor: on ? acc : colors.chip, borderWidth: on ? 0 : 1, borderColor: colors.border5 }}
            >
              <Txt style={{ fontSize: 13, fontFamily: font.b, color: on ? colors.bg : colors.muted }}>{m.label}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingVertical: 22, alignItems: "center", marginBottom: 18 }}>
        <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.b, marginBottom: 10 }}>{`${cur.label} (${cur.unit})`}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
          <Pressable onPress={() => patch({ measureVal: +Math.max(0, state.measureVal - 0.5).toFixed(1) })} style={bigBtn}><Txt style={{ fontSize: 26, color: colors.subtle }}>−</Txt></Pressable>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, minWidth: 90, justifyContent: "center" }}>
            <Txt style={{ fontFamily: font.dB, fontSize: 44 }}>{state.measureVal}</Txt>
            <Txt style={{ fontSize: 16, color: colors.muted, fontFamily: font.b }}>{cur.unit}</Txt>
          </View>
          <Pressable onPress={() => patch({ measureVal: +(state.measureVal + 0.5).toFixed(1) })} style={bigBtn}><Txt style={{ fontSize: 26, color: colors.subtle }}>+</Txt></Pressable>
        </View>
      </View>

      <Pressable
        onPress={guard(() => { addMeasurement(state.measureMetric, state.measureVal); patch({ ov: null }); })}
        style={{ backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center" }}
      >
        <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>Save measurement</Txt>
      </Pressable>
    </BottomSheet>
  );
}

const bigBtn = { width: 48, height: 48, borderRadius: 99, backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border5, alignItems: "center", justifyContent: "center" } as const;
