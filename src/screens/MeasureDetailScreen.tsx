import React from "react";
import { Pressable, ScrollView, View } from "react-native";

import { MetricChart } from "@/components/Charts";
import { TrashIcon } from "@/components/icons";
import { Txt } from "@/components/ui";
import {
  defaultMetricValue,
  metricDelta,
  metricMeta,
  metricSeries,
  shortDate,
} from "@/lib/body";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";

export function MeasureDetailScreen() {
  const { state, patch, open, deleteMeasurement } = useStore();
  const acc = colors.accent;
  const metric = state.detailMetric;
  const meta = metricMeta(metric);
  const P = state.profile;

  const series = metricSeries(state.measurements, metric); // oldest → newest
  const hasData = series.length > 0;
  const cur = hasData ? series[series.length - 1].value : null;
  const delta = metricDelta(state.measurements, metric);
  const goal = metric === "weight" ? P.goalWeight : undefined;
  const chartSeries = series.map((m) => ({ date: m.date, value: m.value }));

  const logHere = () =>
    open("measure", { measureMetric: metric, measureVal: defaultMetricValue(state.measurements, metric, P) });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 130 }}
    >
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6, marginBottom: 18 }}>
        <Pressable
          onPress={() => patch({ screen: "profile" })}
          style={{ width: 36, height: 36, borderRadius: 99, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, alignItems: "center", justifyContent: "center" }}
        >
          <Txt style={{ fontSize: 18, color: colors.subtle }}>‹</Txt>
        </Pressable>
        <Txt style={{ fontFamily: font.dB, fontSize: 22 }}>{meta.label}</Txt>
      </View>

      {/* current value + trend */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Txt style={{ fontFamily: font.dB, fontSize: 38, color: acc }}>{hasData ? cur : "—"}</Txt>
            <Txt style={{ fontSize: 15, color: colors.muted, fontFamily: font.b }}>{meta.unit}</Txt>
          </View>
          {series.length >= 2 && (
            <Txt style={{ fontSize: 13, fontFamily: font.b, color: delta === 0 ? colors.muted : delta > 0 ? colors.over : acc }}>
              {`${delta > 0 ? "+" : ""}${delta} ${meta.unit} since start`}
            </Txt>
          )}
        </View>
        <Txt style={{ fontSize: 11.5, color: colors.dim, fontFamily: font.sb, marginTop: 4 }}>
          {hasData ? `${series.length} ${series.length === 1 ? "entry" : "entries"} logged` : "No measurements yet"}
        </Txt>

        <View style={{ marginTop: 16 }}>
          {hasData ? (
            <MetricChart series={chartSeries} acc={acc} unit={meta.unit} goal={goal} />
          ) : (
            <View style={{ height: 120, alignItems: "center", justifyContent: "center", backgroundColor: colors.inset, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
              <Txt style={{ fontSize: 13, color: colors.muted, fontFamily: font.b }}>Log a few measurements to see your trend</Txt>
            </View>
          )}
        </View>
      </View>

      {/* log button */}
      <Pressable onPress={logHere} style={{ backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center", marginBottom: 22 }}>
        <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>{`Log ${meta.label.toLowerCase()}`}</Txt>
      </Pressable>

      {/* history list (newest first) */}
      <Txt style={{ fontFamily: font.dB, fontSize: 17, marginBottom: 12 }}>History</Txt>
      {hasData ? (
        <View style={{ gap: 8 }}>
          {[...series].reverse().map((m, i, arr) => {
            const prev = arr[i + 1]; // chronologically previous entry
            const diff = prev ? +(m.value - prev.value).toFixed(1) : null;
            return (
              <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border3, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 14.5, fontFamily: font.b }}>
                    {m.value}
                    <Txt style={{ fontSize: 11.5, color: colors.dim, fontFamily: font.b }}>{" " + meta.unit}</Txt>
                  </Txt>
                  <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>{shortDate(m.date)}</Txt>
                </View>
                {diff != null && diff !== 0 && (
                  <Txt style={{ fontSize: 12, fontFamily: font.b, color: diff > 0 ? colors.over : acc }}>
                    {`${diff > 0 ? "+" : ""}${diff}`}
                  </Txt>
                )}
                <Pressable
                  onPress={() => deleteMeasurement(m.id)}
                  hitSlop={8}
                  style={{ width: 32, height: 32, borderRadius: 99, alignItems: "center", justifyContent: "center" }}
                >
                  <TrashIcon size={16} color={colors.dim} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 30, backgroundColor: "#13171D", borderWidth: 1, borderColor: colors.border2, borderRadius: 18, borderStyle: "dashed" }}>
          <Txt style={{ fontSize: 13.5, fontFamily: font.b, color: colors.muted }}>Nothing logged yet</Txt>
          <Txt style={{ fontSize: 12, marginTop: 4, color: colors.dim, fontFamily: font.sb }}>{`Tap "Log ${meta.label.toLowerCase()}" to add your first entry`}</Txt>
        </View>
      )}
    </ScrollView>
  );
}
