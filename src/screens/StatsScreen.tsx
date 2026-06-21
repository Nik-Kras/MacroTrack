import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { NetChart, WeightChart } from "@/components/Charts";
import { MacroBar, Txt } from "@/components/ui";
import { MC } from "@/data/seed";
import { dayKey, round } from "@/lib/nutrition";
import { useStore, useTargets } from "@/store/store";
import { colors, font } from "@/theme";

const spanMeta = [
  { k: "day", l: "Day" },
  { k: "week", l: "Week" },
  { k: "month", l: "Month" },
  { k: "all", l: "All" },
] as const;

export function StatsScreen() {
  const { state, patch, bodyRecords } = useStore();
  const t = useTargets();
  const acc = colors.accent;

  const hist = useMemo(() => {
    const arr: { off: number; kcal: number; p: number; c: number; f: number }[] = [];
    for (let off = -13; off <= 0; off++) {
      const dl = state.logs[dayKey(off)] || [];
      const s = dl.reduce((a, l) => ({ kcal: a.kcal + l.kcal, p: a.p + l.p, c: a.c + l.c, f: a.f + l.f }), { kcal: 0, p: 0, c: 0, f: 0 });
      arr.push({ off, kcal: round(s.kcal), p: round(s.p), c: round(s.c), f: round(s.f) });
    }
    return arr;
  }, [state.logs]);

  const nDays = state.statsSpan === "day" ? 1 : state.statsSpan === "week" ? 7 : 14;
  const slice = hist.slice(-nDays);
  const netData = slice.map((h) => ({ net: h.kcal - t.cal }));
  const avgNet = Math.round(netData.reduce((a, d) => a + d.net, 0) / netData.length);
  const spanLabel = spanMeta.find((s) => s.k === state.statsSpan)!.l.toLowerCase() + (nDays > 1 ? ` · ${nDays} days` : "");
  const avg = (k: "p" | "c" | "f") => Math.round(slice.reduce((a, h) => a + h[k], 0) / slice.length);

  const recs = bodyRecords();
  const wd = +(recs[recs.length - 1].weight - recs[0].weight).toFixed(1);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 130 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6, marginBottom: 18 }}>
        <Pressable
          onPress={() => patch({ screen: "nutrition" })}
          style={{ width: 36, height: 36, borderRadius: 99, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, alignItems: "center", justifyContent: "center" }}
        >
          <Txt style={{ fontSize: 18, color: colors.subtle }}>‹</Txt>
        </Pressable>
        <Txt style={{ fontFamily: font.dB, fontSize: 22 }}>Statistics</Txt>
      </View>

      {/* span tabs */}
      <View style={{ flexDirection: "row", gap: 6, backgroundColor: "#13171D", borderWidth: 1, borderColor: colors.border, borderRadius: 99, padding: 4, marginBottom: 18 }}>
        {spanMeta.map((s) => {
          const on = state.statsSpan === s.k;
          return (
            <Pressable
              key={s.k}
              onPress={() => patch({ statsSpan: s.k })}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 99, alignItems: "center", backgroundColor: on ? acc : "transparent" }}
            >
              <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: on ? colors.bg : colors.muted }}>{s.l}</Txt>
            </Pressable>
          );
        })}
      </View>

      {/* energy balance */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted }}>Energy balance</Txt>
          <Txt style={{ fontSize: 12, fontFamily: font.b, color: avgNet <= 0 ? acc : colors.over }}>
            {`${avgNet <= 0 ? avgNet : "+" + avgNet} kcal / day`}
          </Txt>
        </View>
        <Txt style={{ fontSize: 11.5, color: colors.dim, fontFamily: font.sb, marginBottom: 14 }}>{`Intake vs target · ${spanLabel}`}</Txt>
        <NetChart data={netData} acc={acc} />
      </View>

      {/* macro averages */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18, marginBottom: 14 }}>
        <Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted, marginBottom: 14 }}>Average macros vs target</Txt>
        <View style={{ gap: 13 }}>
          <MacroBar label="Protein" valText={`${avg("p")} / ${t.p} g avg`} cur={avg("p")} tgt={t.p} color={MC.p} />
          <MacroBar label="Carbs" valText={`${avg("c")} / ${t.c} g avg`} cur={avg("c")} tgt={t.c} color={MC.c} />
          <MacroBar label="Fat" valText={`${avg("f")} / ${t.f} g avg`} cur={avg("f")} tgt={t.f} color={MC.f} />
        </View>
      </View>

      {/* weight trend */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <Txt style={{ fontSize: 13, fontFamily: font.b, color: colors.muted }}>Weight trend</Txt>
          <Txt style={{ fontSize: 12, fontFamily: font.b, color: acc }}>{`${wd > 0 ? "+" : ""}${wd} kg`}</Txt>
        </View>
        <WeightChart records={recs} acc={acc} />
      </View>
    </ScrollView>
  );
}
