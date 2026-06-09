import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  values: number[];
  color?: string;
  suffix?: string;
};

export const TrendChart = ({ title, values, color = "#2563EB", suffix = "" }: Props) => {
  const width = 320;
  const height = 120;
  const clean = values.filter((value) => Number.isFinite(value));
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const points = clean.map((value, index) => {
    const x = clean.length === 1 ? width / 2 : (index / (clean.length - 1)) * width;
    const y = height - 18 - ((value - min) / span) * (height - 36);
    return `${x},${y}`;
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {clean.length === 0 ? (
        <Text style={styles.empty}>No data yet</Text>
      ) : (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Line x1="0" y1={height - 18} x2={width} y2={height - 18} stroke="#2B374D" strokeWidth="1" />
          <Polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          {clean.map((value, index) => {
            const [x, y] = points[index]?.split(",").map(Number) ?? [0, 0];
            return <Circle key={`${value}-${index}`} cx={x} cy={y} r="3.5" fill={color} />;
          })}
          <SvgText x="0" y="13" fill="#8B96A8" fontSize="11">
            {Math.round(max)}
            {suffix}
          </SvgText>
          <SvgText x="0" y={height - 3} fill="#8B96A8" fontSize="11">
            {Math.round(min)}
            {suffix}
          </SvgText>
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 14, fontWeight: "800", color: "#F8FAFC" },
  empty: { height: 120, color: "#8B96A8", textAlignVertical: "center" }
});
