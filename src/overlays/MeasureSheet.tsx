import React, { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Txt } from "@/components/ui";
import { METRICS, defaultMetricValue } from "@/lib/body";
import { useSubmitGuard } from "@/lib/useSubmitGuard";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";

/** Keep only digits and a single decimal point ("87,3" → "87.3"). */
function sanitizeDecimal(t: string): string {
  const s = t.replace(",", ".").replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  return firstDot === -1 ? s : s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
}

export function MeasureSheet() {
  const { state, patch, close, addMeasurement } = useStore();
  const guard = useSubmitGuard();
  const acc = colors.accent;
  const cur = METRICS.find((m) => m.key === state.measureMetric)!;
  const [txt, setTxt] = useState(String(state.measureVal));

  const val = parseFloat(txt);
  const valid = !isNaN(val) && val > 0;

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
              onPress={() => {
                const v = defaultMetricValue(state.measurements, m.key, state.profile);
                patch({ measureMetric: m.key, measureVal: v });
                setTxt(String(v));
              }}
              style={{ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 99, backgroundColor: on ? acc : colors.chip, borderWidth: on ? 0 : 1, borderColor: colors.border5 }}
            >
              <Txt style={{ fontSize: 13, fontFamily: font.b, color: on ? colors.bg : colors.muted }}>{m.label}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingVertical: 22, alignItems: "center", marginBottom: 18 }}>
        <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.b, marginBottom: 10 }}>{`${cur.label} (${cur.unit})`}</Txt>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, justifyContent: "center" }}>
          <TextInput
            value={txt}
            onChangeText={(t) => setTxt(sanitizeDecimal(t))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.dim}
            selectTextOnFocus
            style={{ fontFamily: font.dB, fontSize: 44, color: colors.text, padding: 0, minWidth: 130, textAlign: "center" }}
          />
          <Txt style={{ fontSize: 16, color: colors.muted, fontFamily: font.b }}>{cur.unit}</Txt>
        </View>
      </View>

      <Pressable
        onPress={guard(() => { addMeasurement(state.measureMetric, +val.toFixed(1)); patch({ ov: null }); })}
        disabled={!valid}
        style={{ backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center", opacity: valid ? 1 : 0.4 }}
      >
        <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>Save measurement</Txt>
      </Pressable>
    </BottomSheet>
  );
}
