import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  Pressable,
  StyleProp,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { gradientFor } from "@/lib/nutrition";
import { colors, font } from "@/theme";

export function Txt({ style, ...rest }: TextProps & { style?: StyleProp<TextStyle> }) {
  return <Text {...rest} style={[{ color: colors.text, fontFamily: font.sb }, style]} />;
}

/** Food/dish visual: local photo if present, else deterministic gradient tile + emoji. */
export function Visual({
  photo,
  name,
  emoji,
  size,
  radius,
  full,
  height,
  children,
  style,
}: {
  photo?: string;
  name?: string;
  emoji?: string;
  size?: number;
  radius: number;
  full?: boolean;
  height?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const dims: ViewStyle = full
    ? { width: "100%", height: height ?? 104, borderRadius: radius }
    : { width: size, height: size, borderRadius: radius };
  if (photo) {
    return (
      <View style={[dims, { overflow: "hidden" }, style]}>
        <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        {children}
      </View>
    );
  }
  const [g1, g2] = gradientFor(name || "x");
  const fontSize = full ? (height ?? 104) * 0.42 : (size ?? 40) * 0.42;
  return (
    <LinearGradient
      colors={[g1, g2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[dims, { alignItems: "center", justifyContent: "center", overflow: "hidden" }, style]}
    >
      {!!emoji && (
        <Text style={{ fontSize, fontFamily: font.dB, color: "rgba(255,255,255,.92)" }}>{emoji}</Text>
      )}
      {children}
    </LinearGradient>
  );
}

export function MacroBar({
  label,
  valText,
  cur,
  tgt,
  color,
  onPress,
}: {
  label: string;
  valText: string;
  cur: number;
  tgt: number;
  color: string;
  onPress?: () => void;
}) {
  const pct = Math.min((cur / tgt) * 100, 100);
  return (
    <Pressable onPress={onPress} style={{ width: "100%" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <Txt style={{ fontSize: 12.5, fontFamily: font.b, color: colors.subtle }}>{label}</Txt>
        <Txt style={{ fontSize: 11.5, fontFamily: font.sb, color: colors.muted }}>{valText}</Txt>
      </View>
      <View style={{ height: 7, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", borderRadius: 99, backgroundColor: color }} />
      </View>
    </Pressable>
  );
}

export function Stepper({
  value,
  onDec,
  onInc,
  big,
}: {
  value: React.ReactNode;
  onDec: () => void;
  onInc: () => void;
  big?: boolean;
}) {
  const btn: ViewStyle = {
    width: 36,
    height: 36,
    borderRadius: big ? 99 : 9,
    backgroundColor: colors.chip,
    borderWidth: big ? 1 : 0,
    borderColor: colors.border5,
    alignItems: "center",
    justifyContent: "center",
  };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.inset,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 13,
        padding: 5,
      }}
    >
      <Pressable onPress={onDec} style={btn}>
        <Txt style={{ fontSize: 20, color: colors.subtle }}>−</Txt>
      </Pressable>
      <Txt style={{ flex: 1, textAlign: "center", fontFamily: font.dB, fontSize: 18 }}>{value}</Txt>
      <Pressable onPress={onInc} style={btn}>
        <Txt style={{ fontSize: 20, color: colors.subtle }}>+</Txt>
      </Pressable>
    </View>
  );
}

export function RoundBtn({
  children,
  onPress,
  size = 34,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: 99,
          backgroundColor: colors.chip,
          borderWidth: 1,
          borderColor: colors.border5,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export const SectionHeader = ({ title, hint }: { title: string; hint?: string }) => (
  <View
    style={{
      marginTop: 26,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <Txt style={{ fontFamily: font.dB, fontSize: 17 }}>{title}</Txt>
    {!!hint && <Txt style={{ fontSize: 12, color: colors.muted, fontFamily: font.sb }}>{hint}</Txt>}
  </View>
);
