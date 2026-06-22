import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";

import { Spark } from "@/components/Charts";
import { StatsIcon } from "@/components/icons";
import { Txt, Visual } from "@/components/ui";
import { GOAL, MC } from "@/data/seed";
import { METRICS, defaultMetricValue, metricDelta, metricSeries } from "@/lib/body";
import { exportBackup, importBackup } from "@/lib/backup";
import { useStore, useTargets } from "@/store/store";
import { colors, font } from "@/theme";
import type { MetricKey } from "@/types";

export function ProfileScreen() {
  const { state, patch, open, restore } = useStore();
  const t = useTargets();
  const P = state.profile;
  const acc = colors.accent;
  const [busy, setBusy] = useState<null | "export" | "import">(null);

  const openDetail = (metric: MetricKey) => patch({ screen: "measureDetail", detailMetric: metric });
  const logMeasurement = (metric: MetricKey) =>
    open("measure", { measureMetric: metric, measureVal: defaultMetricValue(state.measurements, metric, P) });

  const onExport = async () => {
    if (busy) return;
    try {
      setBusy("export");
      await exportBackup({
        profile: state.profile,
        logs: state.logs,
        foods: state.foods,
        dishes: state.dishes,
        measurements: state.measurements,
      });
    } catch (e: any) {
      Alert.alert("Export failed", e?.message || "Could not create the backup file.");
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    try {
      setBusy("import");
      const data = await importBackup();
      if (!data) return; // user cancelled the file picker
      restore(data);
      Alert.alert("Restore complete", "Your data has been restored from the backup.");
    } catch (e: any) {
      Alert.alert("Restore failed", e?.message || "Could not read that backup file.");
    } finally {
      setBusy(null);
    }
  };

  const onImport = () => {
    if (busy) return;
    Alert.alert(
      "Restore from backup?",
      "This replaces ALL current data — profile, logs, foods, dishes and measurements — with the contents of the backup file. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Choose file", style: "destructive", onPress: doImport },
      ],
    );
  };

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
        <Pressable onPress={() => open("onb", { draft: { ...P } })}>
          <Visual photo={P.photo} name={P.name || "You"} emoji={(P.name || "🙂").slice(0, 1).toUpperCase()} size={54} radius={27} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: font.dB, fontSize: 22, color: P.name ? colors.text : colors.muted }}>{P.name || "Add your name"}</Txt>
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
        <Pressable onPress={() => logMeasurement("weight")}>
          <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: acc }}>+ Log measurement</Txt>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {METRICS.map((md) => {
          const series = metricSeries(state.measurements, md.key).map((m) => m.value);
          const hasData = series.length > 0;
          const cur = hasData ? series[series.length - 1] : null;
          const delta = metricDelta(state.measurements, md.key);
          const goal = md.key === "weight" ? P.goalWeight : null;
          const trend = !hasData
            ? "No data yet — tap to log"
            : series.length < 2
            ? "First entry · tap for details"
            : (delta === 0 ? "No change" : (delta > 0 ? "+" : "") + delta + " " + md.unit) + " since start";
          // weight-goal progress (only metric with a user goal)
          const start = hasData ? series[0] : 0;
          const total = goal != null ? Math.abs(goal - start) || 1 : 1;
          const done = goal != null && cur != null ? Math.abs(cur - start) : 0;
          const pct = goal != null ? Math.max(0, Math.min((done / total) * 100, 100)) : 0;
          return (
            <Pressable
              key={md.key}
              onPress={() => openDetail(md.key)}
              style={{ backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border3, borderRadius: 16, padding: 14 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: goal != null && hasData ? 10 : 0 }}>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>{md.label}</Txt>
                  <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>{trend}</Txt>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {series.length >= 2 && <Spark vals={series} color={acc} />}
                  <View style={{ alignItems: "flex-end", minWidth: 52 }}>
                    <Txt style={{ fontFamily: font.dB, fontSize: 18, color: hasData ? colors.text : colors.dim }}>
                      {hasData ? cur : "—"}
                      {hasData && <Txt style={{ fontSize: 11, color: colors.dim, fontFamily: font.b }}>{" " + md.unit}</Txt>}
                    </Txt>
                    {goal != null && <Txt style={{ fontSize: 10.5, color: colors.dim, fontFamily: font.b }}>{`goal ${goal}${md.unit}`}</Txt>}
                  </View>
                  <Txt style={{ fontSize: 18, color: colors.dim, marginLeft: 2 }}>›</Txt>
                </View>
              </View>
              {goal != null && hasData && (
                <View style={{ height: 6, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}>
                  <View style={{ width: `${pct}%`, height: "100%", borderRadius: 99, backgroundColor: acc }} />
                </View>
              )}
            </Pressable>
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

      {/* data: backup & restore */}
      <View style={{ marginTop: 24, marginBottom: 12 }}>
        <Txt style={{ fontFamily: font.dB, fontSize: 17 }}>Data</Txt>
        <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.sb, marginTop: 3 }}>
          Save a backup file you can keep anywhere, then restore it after reinstalling or on a new phone.
        </Txt>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={onExport}
          disabled={!!busy}
          style={{ flex: 1, backgroundColor: acc, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.6 : 1 }}
        >
          {busy === "export" ? (
            <ActivityIndicator color={colors.bg} size="small" />
          ) : (
            <Txt style={{ fontSize: 14, fontFamily: font.xb, color: colors.bg }}>Export backup</Txt>
          )}
        </Pressable>
        <Pressable
          onPress={onImport}
          disabled={!!busy}
          style={{ flex: 1, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, borderRadius: 16, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.6 : 1 }}
        >
          {busy === "import" ? (
            <ActivityIndicator color={colors.subtle} size="small" />
          ) : (
            <Txt style={{ fontSize: 14, fontFamily: font.b, color: colors.subtle }}>Restore backup</Txt>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
