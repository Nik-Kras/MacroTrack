import { StyleSheet, Text, View } from "react-native";
import { roundHalfUp } from "../domain/rounding";

type Props = {
  label: string;
  value: number;
  target: number;
  unit: string;
  tone?: "green" | "blue" | "amber" | "red";
};

const tones = {
  green: "#188A5B",
  blue: "#2563EB",
  amber: "#B7791F",
  red: "#C2410C"
};

export const MacroBar = ({ label, value, target, unit, tone = "green" }: Props) => {
  const percent = target > 0 ? value / target : 0;
  const over = percent > 1;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, over && styles.over]}>
          {roundHalfUp(value)} / {roundHalfUp(target)} {unit}
        </Text>
      </View>
      <View style={styles.track}>
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
  over: { color: "#D84A2B" },
  track: { height: 9, borderRadius: 3, backgroundColor: "#E7E1D6", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 }
});
