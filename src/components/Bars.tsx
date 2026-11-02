import { StyleSheet, Text, View } from "react-native";
import { roundHalfUp } from "../domain/rounding";

type Props = {
  label: string;
  value: number;
  target: number;
  unit: string;
  tone?: "green" | "blue" | "amber" | "red";
  variant?: "light" | "dark";
};

const tones = {
  green: "#188A5B",
  blue: "#2563EB",
  amber: "#B7791F",
  red: "#C2410C"
};

export const MacroBar = ({ label, value, target, unit, tone = "green", variant = "light" }: Props) => {
  const percent = target > 0 ? value / target : 0;
  const over = percent > 1;
  const dark = variant === "dark";
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.label, dark && styles.darkLabel]}>{label}</Text>
        <Text style={[styles.value, dark && styles.darkValue, over && styles.over]}>
          {roundHalfUp(value)} / {roundHalfUp(target)} {unit}
        </Text>
      </View>
      <View style={[styles.track, dark && styles.darkTrack]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(percent, 1) * 100}%`, backgroundColor: over ? "#D84A2B" : tones[tone] }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, color: "#4B5563", fontWeight: "700" },
  value: { fontSize: 13, color: "#111827", fontWeight: "700" },
  darkLabel: { color: "#B9C2D3" },
  darkValue: { color: "#F8FAFC" },
  over: { color: "#D84A2B" },
  track: { height: 9, borderRadius: 3, backgroundColor: "#E7E1D6", overflow: "hidden" },
  darkTrack: { backgroundColor: "#263044" },
  fill: { height: "100%", borderRadius: 3 }
});
