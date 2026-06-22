import React from "react";
import { Pressable, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { RoundBtn, Txt } from "@/components/ui";
import { dateForOffset, dayKey, entryMacros, fmtKey, offsetForKey } from "@/lib/nutrition";
import { useStore, useTargets } from "@/store/store";
import { colors, font } from "@/theme";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarSheet() {
  const { state, patch, close } = useStore();
  const t = useTargets();
  const acc = colors.accent;

  const netForKey = (key: string) => {
    const logs = state.logs[key];
    if (logs && logs.length) {
      const k = logs.reduce((a, l) => a + entryMacros(l, state.foods, state.dishes).kcal, 0);
      return { has: true, kcal: Math.round(k), net: Math.round(k - t.cal) };
    }
    return { has: false, kcal: 0, net: 0 };
  };

  const first = new Date(state.calY, state.calM, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(state.calY, state.calM + 1, 0).getDate();
  const todayKey = dayKey(0), selKey = dayKey(state.dayOffset);
  const title = new Date(state.calY, state.calM, 1).toLocaleDateString("en", { month: "long", year: "numeric" });

  const calPrev = () => { let m = state.calM - 1, y = state.calY; if (m < 0) { m = 11; y--; } patch({ calM: m, calY: y }); };
  const calNext = () => { let m = state.calM + 1, y = state.calY; if (m > 11) { m = 0; y++; } patch({ calM: m, calY: y }); };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < lead; i++) cells.push(<View key={`b${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const ck = fmtKey(new Date(state.calY, state.calM, day));
    const off = offsetForKey(ck), info = netForKey(ck);
    const isFuture = off > 0, isToday = ck === todayKey, isSel = ck === selKey;
    let bg = "transparent", txt = "#7a828f";
    if (info.has) {
      const a = Math.min(0.85, 0.22 + Math.abs(info.net) / 700);
      bg = info.net <= 0 ? `rgba(57,224,138,${a})` : `rgba(242,105,143,${a})`;
      txt = colors.text;
    }
    cells.push(
      <View key={ck} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
        <Pressable
          onPress={isFuture ? undefined : () => patch({ dayOffset: off, screen: "nutrition", ov: null })}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: bg,
            borderWidth: isSel ? 2 : 1,
            borderColor: isSel ? acc : isToday ? acc + "99" : "#181d24",
            opacity: isFuture ? 0.45 : 1,
          }}
        >
          <Txt style={{ fontSize: 14, fontFamily: font.b, color: isFuture ? "#363b43" : txt }}>{day}</Txt>
        </Pressable>
      </View>,
    );
  }

  const selInfo = netForKey(selKey);
  const selDate = dateForOffset(state.dayOffset);
  const summaryDate = selDate.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
  let summaryText = "Nothing logged";
  let summaryColor: string = colors.muted;
  let summaryKcal = "Tap + to start";
  if (selInfo.has) {
    const n = selInfo.net;
    summaryText = n <= 0 ? `${Math.abs(n)} kcal under target` : `${n} kcal over target`;
    summaryColor = n <= 0 ? acc : colors.over;
    summaryKcal = `${selInfo.kcal} kcal logged`;
  }

  return (
    <BottomSheet visible onClose={close} scroll={false}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <RoundBtn onPress={calPrev}><Txt style={{ fontSize: 17, color: colors.subtle }}>‹</Txt></RoundBtn>
        <Txt style={{ fontFamily: font.dB, fontSize: 18 }}>{title}</Txt>
        <RoundBtn onPress={calNext}><Txt style={{ fontSize: 17, color: colors.subtle }}>›</Txt></RoundBtn>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        {DOW.map((d) => (
          <Txt key={d} style={{ width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontFamily: font.b, color: colors.dim }}>{d}</Txt>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{cells}</View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 16, marginBottom: 4, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 11, height: 11, borderRadius: 4, backgroundColor: "rgba(57,224,138,.7)" }} />
          <Txt style={{ fontSize: 11.5, fontFamily: font.b, color: colors.muted }}>Deficit</Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 11, height: 11, borderRadius: 4, backgroundColor: "rgba(242,105,143,.7)" }} />
          <Txt style={{ fontSize: 11.5, fontFamily: font.b, color: colors.muted }}>Surplus</Txt>
        </View>
      </View>

      <View style={{ backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>{summaryDate}</Txt>
            <Txt style={{ fontSize: 11.5, color: colors.dim, fontFamily: font.sb, marginTop: 2 }}>{summaryKcal}</Txt>
          </View>
          <Txt style={{ fontSize: 13.5, fontFamily: font.xb, color: summaryColor }}>{summaryText}</Txt>
        </View>
      </View>
    </BottomSheet>
  );
}
