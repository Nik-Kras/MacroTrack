import React from "react";
import { Pressable, TextInput, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Stepper, Txt, Visual } from "@/components/ui";
import { ACTMETA } from "@/data/seed";
import { computeTargets } from "@/lib/nutrition";
import { pickPhoto } from "@/lib/photo";
import { useStore } from "@/store/store";
import { colors, font } from "@/theme";
import type { ActivityKey, GoalKey, Profile, Sex } from "@/types";

export function OnboardingSheet() {
  const { state, patch, close } = useStore();
  const acc = colors.accent;
  const D = (state.draft || state.profile) as Profile;
  const setD = (k: keyof Profile, v: any) => patch({ draft: { ...D, [k]: v } });
  const pv = computeTargets(D);

  const seg = (on: boolean, small?: boolean): any => ({
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: on ? acc : colors.chip,
    borderWidth: on ? 0 : 1,
    borderColor: colors.border5,
  });
  const segTxt = (on: boolean, small?: boolean) => ({ fontSize: small ? 12 : 13, fontFamily: font.b, color: on ? colors.bg : colors.muted });

  const label = (s: string) => <Txt style={{ fontSize: 12, fontFamily: font.b, color: colors.muted, marginBottom: 8 }}>{s}</Txt>;

  return (
    <BottomSheet visible onClose={close}>
      <Txt style={{ fontFamily: font.dB, fontSize: 21, marginBottom: 4 }}>Your profile &amp; goal</Txt>
      <Txt style={{ fontSize: 12.5, color: colors.muted, fontFamily: font.sb, marginBottom: 20 }}>Targets recalculate automatically</Txt>

      {/* name + photo */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Pressable onPress={async () => { const uri = await pickPhoto(); if (uri) setD("photo", uri); }}>
          <Visual photo={D.photo} name={D.name || "You"} emoji={(D.name || "🙂").slice(0, 1).toUpperCase()} size={64} radius={32} />
          <View style={{ position: "absolute", bottom: -2, right: -2, backgroundColor: acc, borderRadius: 99, width: 22, height: 22, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card }}>
            <Txt style={{ fontSize: 11, color: colors.bg, fontFamily: font.xb }}>+</Txt>
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          {label("Name")}
          <TextInput
            value={D.name}
            onChangeText={(t) => setD("name", t)}
            placeholder="Your name"
            placeholderTextColor={colors.dim}
            style={{ backgroundColor: colors.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, color: colors.text, fontFamily: font.b, fontSize: 15 }}
          />
        </View>
      </View>

      {label("Sex")}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
        {(["male", "female"] as Sex[]).map((s) => {
          const on = D.sex === s;
          return (
            <Pressable key={s} onPress={() => setD("sex", s)} style={seg(on)}>
              <Txt style={segTxt(on)}>{s === "male" ? "Male" : "Female"}</Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <View style={{ width: "47%", flexGrow: 1 }}>
          {label("Age")}
          <Stepper value={D.age} onDec={() => setD("age", Math.max(14, D.age - 1))} onInc={() => setD("age", D.age + 1)} />
        </View>
        <View style={{ width: "47%", flexGrow: 1 }}>
          {label("Height (cm)")}
          <Stepper value={D.height} onDec={() => setD("height", Math.max(120, D.height - 1))} onInc={() => setD("height", D.height + 1)} />
        </View>
        <View style={{ width: "47%", flexGrow: 1 }}>
          {label("Current weight (kg)")}
          <Stepper value={D.weight} onDec={() => setD("weight", Math.max(35, D.weight - 1))} onInc={() => setD("weight", D.weight + 1)} />
        </View>
        <View style={{ width: "47%", flexGrow: 1 }}>
          {label("Goal weight (kg)")}
          <Stepper value={D.goalWeight} onDec={() => setD("goalWeight", Math.max(35, D.goalWeight - 1))} onInc={() => setD("goalWeight", D.goalWeight + 1)} />
        </View>
      </View>

      {label("Goal")}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
        {([["fatloss", "Fat loss"], ["maintain", "Maintain"], ["gain", "Gain"]] as [GoalKey, string][]).map(([k, l]) => {
          const on = D.goal === k;
          return (
            <Pressable key={k} onPress={() => setD("goal", k)} style={seg(on, true)}>
              <Txt style={segTxt(on, true)}>{l}</Txt>
            </Pressable>
          );
        })}
      </View>

      {label("Activity")}
      <View style={{ gap: 8, marginBottom: 18 }}>
        {ACTMETA.map((o) => {
          const on = D.activity === (o.key as ActivityKey);
          return (
            <Pressable
              key={o.key}
              onPress={() => setD("activity", o.key)}
              style={{ paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, backgroundColor: on ? acc + "1f" : colors.inset, borderWidth: 1, borderColor: on ? acc : colors.border }}
            >
              <Txt style={{ fontSize: 13.5, fontFamily: font.b }}>{o.label}</Txt>
              <Txt style={{ fontSize: 11.5, color: colors.muted, fontFamily: font.sb, marginTop: 1 }}>{o.desc}</Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ backgroundColor: colors.inset, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Txt style={{ fontSize: 12, fontFamily: font.b, color: colors.muted, marginBottom: 6 }}>New daily target</Txt>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Txt style={{ fontFamily: font.dB, fontSize: 30, color: acc }}>{pv.cal}</Txt>
          <Txt style={{ fontSize: 13, color: colors.muted, fontFamily: font.b }}>{`kcal · ${pv.p}P · ${pv.c}C · ${pv.f}F`}</Txt>
        </View>
      </View>

      <Pressable onPress={() => patch({ profile: { ...D }, ov: null, draft: null })} style={{ backgroundColor: acc, borderRadius: 16, padding: 15, alignItems: "center" }}>
        <Txt style={{ color: colors.bg, fontFamily: font.xb, fontSize: 16 }}>Save profile</Txt>
      </Pressable>
    </BottomSheet>
  );
}
