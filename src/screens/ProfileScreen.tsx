import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Spark } from "@/components/Charts";
import { StatsIcon } from "@/components/icons";
import { SectionHeader, Txt } from "@/components/ui";
import { GOAL, GOALS_BODY, MC } from "@/data/seed";
import { useStore, useTargets } from "@/store/store";
import { colors, font } from "@/theme";
import type { BodyRecord } from "@/types";

const metricDefs: { key: keyof Omit<BodyRecord, "d">; label: string; unit: string }[] = [
  { key: "weight", label: "Weight", unit: " kg" },
  { key: "waist", label: "Waist", unit: " cm" },
  { key: "bicep", label: "Bicep", unit: " cm" },
  { key: "chest", label: "Chest", unit: " cm" },
  { key: "leg", label: "Leg", unit: " cm" },
];

export function ProfileScreen() {
  const { state, patch, open, bodyRecords } = useStore();
  const t = useTargets();
  const P = state.profile;
  const acc = colors.accent;
  const recs = bodyRecords();

  const targetMacros = [
    { label: "Protein", value: t.p, color: MC.p },
    { label: "Carbs", value: t.c, color: MC.c },
    { label: "Fat", value: t.f, color: MC.f },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 130 }}
    >
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 6, marginBottom: 20 }}>
        <LinearGradient
          colors={[acc, "#2a8f63"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 54, height: 54, borderRadius: 99, alignItems: "center", justifyContent: "center" }}
        >
          <Txt style={{ fontFamily: font.dB, fontSize: 22, color: colors.bg }}>{(P.name || "A").slice(0, 1).toUpperCase()}</Txt>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: font.dB, fontSize: 22 }}>{P.name}</Txt>
          <Txt style={{ fontSize: 12.5, color: colors.muted, fontFamily: font.sb }}>{`${P.weight} kg · ${P.height} cm · ${P.age} y`}</Txt>
        </View>
        <Pressable
          onPress={() => open("onb", { draft: { ...P } })}
          style={{ backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14 }}
        >
          <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: colors.subtle }}>Edit</Txt>
        </Pressable>
      </View>

      {/* targets */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted }}>{`Daily targets · ${GOAL[P.goal].label}`}</Txt>
          <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.sb }}>{`BMR ${t.bmr} · TDEE ${t.tdee}`}</Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
          <Txt style={{ fontFamily: font.dB, fontSize: 38, color: acc }}>{t.cal}</Txt>
          <Txt style={{ fontSize: 14, color: colors.muted, fontFamily: font.b }}>kcal / day</Txt>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {targetMacros.map((m) => (
            <View key={m.label} style={{ flex: 1, backgroundColor: colors.inset, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: m.color }} />
                <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.b }}>{m.label}</Txt>
              </View>
              <Txt style={{ fontFamily: font.dB, fontSize: 19 }}>
                {m.value}
                <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.b }}>g</Txt>
              </Txt>
            </View>
          ))}
        </View>
      </View>

      {/* body */}
      <View style={{ marginTop: 24, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Txt style={{ fontFamily: font.dB, fontSize: 17 }}>Body</Txt>
        <Pressable onPress={() => open("measure", { measureMetric: "weight", measureVal: recs[recs.length - 1].weight })}>
          <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: acc }}>+ Log measurement</Txt>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {metricDefs.map((md) => {
          const series = recs.map((r) => r[md.key]);
          const cur = series[series.length - 1], start = series[0], goal = GOALS_BODY[md.key];
          const total = Math.abs(goal - start) || 1, done = Math.abs(cur - start);
          const pct = Math.max(0, Math.min((done / total) * 100, 100));
          const delta = +(cur - start).toFixed(1);
          const trend = (delta === 0 ? "No change" : (delta > 0 ? "+" : "") + delta + md.unit) + " since start";
          return (
            <View key={md.key} style={{ backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border3, borderRadius: 16, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <View>
                  <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>{md.label}</Txt>
                  <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>{trend}</Txt>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Spark vals={series} color={acc} />
                  <View style={{ alignItems: "flex-end" }}>
                    <Txt style={{ fontFamily: font.dB, fontSize: 18 }}>
                      {cur}
                      <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.b }}>{md.unit}</Txt>
                    </Txt>
                    <Txt style={{ fontSize: 10.5, color: colors.dim, fontFamily: font.b }}>{`goal ${goal}${md.unit.trim()}`}</Txt>
                  </View>
                </View>
              </View>
              <View style={{ height: 6, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}>
                <View style={{ width: `${pct}%`, height: "100%", borderRadius: 99, backgroundColor: acc }} />
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={() => patch({ screen: "stats" })}
        style={{ marginTop: 18, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <StatsIcon />
        <Txt style={{ fontSize: 14, fontFamily: font.b, color: colors.subtle }}>View statistics</Txt>
      </Pressable>
    </ScrollView>
  );
}
