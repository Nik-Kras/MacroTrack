import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Ring } from "@/components/Charts";
import { CalendarIcon } from "@/components/icons";
import { MacroBar, SectionHeader, Txt, Visual } from "@/components/ui";
import { UpdateBanner } from "@/components/UpdateBanner";
import { CATMETA, MC } from "@/data/seed";
import {
  dateForOffset,
  dayKey,
  entryMacros,
  findDish,
  findFood,
  glyphForLog,
  round,
  weightLabel,
} from "@/lib/nutrition";
import { groupDayLog, type MacroTotals } from "@/lib/mealGroups";
import { useStore, useTargets } from "@/store/store";
import { colors, font } from "@/theme";
import type { Dish, Food, LogEntry } from "@/types";

function dateLabels(off: number) {
  if (off === -1) return { dateLabel: "Yesterday", dateWord: "yesterday" };
  if (off === 0) return { dateLabel: "Today", dateWord: "today" };
  const s = dateForOffset(off).toLocaleDateString("en", { month: "short", day: "numeric" });
  return { dateLabel: s, dateWord: s };
}

function LogRow({ entry: l, foods, dishes, onEdit, inGroup }: {
  entry: LogEntry;
  foods: Food[];
  dishes: Dish[];
  onEdit: (l: LogEntry) => void;
  inGroup?: boolean;
}) {
  const obj = l.kind === "dish" ? findDish(dishes, l.dishId) : findFood(foods, l.foodId);
  const wlab = l.kind === "dish" ? `${l.grams} g` : weightLabel(findFood(foods, l.foodId), l.grams, l.mode);
  const m = entryMacros(l, foods, dishes);
  return (
    <Pressable
      delayLongPress={550}
      onLongPress={() => onEdit(l)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        backgroundColor: inGroup ? colors.card : colors.card2,
        borderWidth: 1,
        borderColor: inGroup ? colors.border4 : colors.border3,
        borderRadius: inGroup ? 13 : 16,
        paddingVertical: 11,
        paddingHorizontal: 13,
      }}
    >
      <Visual photo={obj?.photo} name={obj?.name} emoji={glyphForLog(l, foods, dishes)} size={44} radius={13} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={{ fontSize: 14.5, fontFamily: font.b }}>{l.name}</Txt>
        <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.sb, marginTop: 2 }}>
          {`${wlab} · P ${round(m.p)} · C ${round(m.c)} · F ${round(m.f)}`}
        </Txt>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Txt style={{ fontSize: 14.5, fontFamily: font.xb }}>{m.kcal}</Txt>
        <Txt style={{ fontSize: 10.5, color: colors.dim, fontFamily: font.b, letterSpacing: 0.4 }}>KCAL</Txt>
      </View>
    </Pressable>
  );
}

function GroupHeader({ title, totals }: { title: string; totals: MacroTotals }) {
  const chips = [
    { k: "P", v: totals.p, c: MC.p },
    { k: "C", v: totals.c, c: MC.c },
    { k: "F", v: totals.f, c: MC.f },
  ];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingTop: 10, paddingBottom: 9 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={{ fontFamily: font.dB, fontSize: 15, letterSpacing: -0.2 }}>{title}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 3 }}>
          {chips.map((m) => (
            <View key={m.k} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: m.c }} />
              <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb }}>{`${m.k} ${round(m.v)}`}</Txt>
            </View>
          ))}
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Txt style={{ fontSize: 15, fontFamily: font.xb }}>{totals.kcal}</Txt>
        <Txt style={{ fontSize: 10.5, color: colors.dim, fontFamily: font.b, letterSpacing: 0.4 }}>KCAL</Txt>
      </View>
    </View>
  );
}

export function NutritionScreen() {
  const { state, patch, open } = useStore();
  const t = useTargets();

  const key = dayKey(state.dayOffset);
  const dayLogs = state.logs[key] || [];
  const sum = useMemo(
    () =>
      dayLogs.reduce(
        (a, l) => {
          const m = entryMacros(l, state.foods, state.dishes);
          return { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f };
        },
        { kcal: 0, p: 0, c: 0, f: 0 },
      ),
    [dayLogs, state.foods, state.dishes],
  );
  const { dateLabel, dateWord } = dateLabels(state.dayOffset);
  const acc = colors.accent;

  const sections = useMemo(
    () => groupDayLog(dayLogs, state.foods, state.dishes),
    [dayLogs, state.foods, state.dishes],
  );

  const macroBars = [
    { label: "Protein", color: MC.p, cur: sum.p, tgt: t.p },
    { label: "Carbs", color: MC.c, cur: sum.c, tgt: t.c },
    { label: "Fat", color: MC.f, cur: sum.f, tgt: t.f },
  ];

  const editLog = (l: LogEntry) =>
    patch({ ov: "grams", gTarget: "edit", editId: l.id, addGrams: l.grams, gMode: l.mode === "cooked" ? "cooked" : "raw", selFood: l.kind === "food" ? l.foodId ?? null : null });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 130 }}
    >
      <UpdateBanner />
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 18 }}>
        <View>
          <Txt style={{ fontSize: 13, color: colors.muted, fontFamily: font.sb }}>
            {state.dayOffset === 0 ? "Good morning" : "Viewing"}
          </Txt>
          <Txt style={{ fontFamily: font.dB, fontSize: 26, letterSpacing: -0.5 }}>{state.profile.name}</Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, borderRadius: 99, padding: 5, gap: 4 }}>
          <Pressable onPress={() => patch({ dayOffset: state.dayOffset - 1 })} style={{ width: 28, height: 28, borderRadius: 99, alignItems: "center", justifyContent: "center" }}>
            <Txt style={{ fontSize: 18, color: colors.muted }}>‹</Txt>
          </Pressable>
          <Pressable
            onPress={() => { const d = dateForOffset(state.dayOffset); open("calendar", { calY: d.getFullYear(), calM: d.getMonth() }); }}
            style={{ minWidth: 80, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }}
          >
            <Txt style={{ fontSize: 13, fontFamily: font.b }}>{dateLabel}</Txt>
            <CalendarIcon />
          </Pressable>
          <Pressable
            onPress={() => { if (state.dayOffset < 0) patch({ dayOffset: state.dayOffset + 1 }); }}
            style={{ width: 28, height: 28, borderRadius: 99, alignItems: "center", justifyContent: "center" }}
          >
            <Txt style={{ fontSize: 18, color: state.dayOffset < 0 ? colors.muted : colors.dim }}>›</Txt>
          </Pressable>
        </View>
      </View>

      {/* ring + macros */}
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20, flexDirection: "row", gap: 18, alignItems: "center" }}>
        <Pressable onPress={() => patch({ screen: "stats" })}>
          <Ring cur={sum.kcal} tgt={t.cal} acc={acc} />
        </Pressable>
        <View style={{ flex: 1, gap: 14 }}>
          {macroBars.map((b) => (
            <MacroBar
              key={b.label}
              label={b.label}
              valText={`${round(b.cur)} / ${b.tgt} g`}
              cur={b.cur}
              tgt={b.tgt}
              color={b.color}
              onPress={() => patch({ screen: "stats" })}
            />
          ))}
        </View>
      </View>

      {/* categories */}
      <SectionHeader title="Eat smart" hint="Curated for your goal" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -18 }}
        contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}
      >
        {CATMETA.map((cm) => {
          const count = state.foods.filter((f) => f.cats.includes(cm.key)).length;
          return (
            <Pressable
              key={cm.key}
              onPress={() => open("addFood", { addCat: cm.key, addSearch: "" })}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14 }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: cm.color }} />
              <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>{cm.label}</Txt>
              <Txt style={{ fontSize: 11, color: colors.muted, fontFamily: font.sb }}>{count}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* today log */}
      <SectionHeader title={`Logged ${dateWord}`} hint="Long-press to edit" />
      {dayLogs.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 34, paddingHorizontal: 20, backgroundColor: "#13171D", borderWidth: 1, borderColor: colors.border2, borderRadius: 18, borderStyle: "dashed" }}>
          <Txt style={{ fontSize: 14, fontFamily: font.b, color: colors.muted }}>Nothing logged yet</Txt>
          <Txt style={{ fontSize: 12.5, marginTop: 4, color: colors.dim }}>Tap + to add a food or use a dish</Txt>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {sections.map((s) =>
            s.kind === "single" ? (
              <LogRow key={s.id} entry={s.entry} foods={state.foods} dishes={state.dishes} onEdit={editLog} />
            ) : (
              <View key={s.id} style={{ backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border2, borderRadius: 18, padding: 6, paddingTop: 0 }}>
                <GroupHeader title={s.title} totals={s.totals} />
                <View style={{ gap: 6 }}>
                  {s.entries.map((e) => (
                    <LogRow key={e.id} entry={e} foods={state.foods} dishes={state.dishes} onEdit={editLog} inGroup />
                  ))}
                </View>
              </View>
            ),
          )}
        </View>
      )}
    </ScrollView>
  );
}
