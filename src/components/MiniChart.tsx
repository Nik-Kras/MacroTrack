import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Props = {
  values: number[];
  height?: number;
  color?: string;
  emptyLabel?: string;
};

export function MiniChart({ values, height = 110, color = colors.green, emptyLabel = 'No data yet' }: Props) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const width = 320;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min || 1;
  const points = clean
    .map((value, index) => {
      const x = (index / (clean.length - 1)) * width;
      const y = height - 18 - ((value - min) / range) * (height - 36);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1="0" y1={height - 18} x2={width} y2={height - 18} stroke={colors.line} strokeWidth="1" />
      <Line x1="0" y1="18" x2={width} y2="18" stroke={colors.line} strokeWidth="1" />
      <Polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {clean.map((value, index) => {
        const x = (index / (clean.length - 1)) * width;
        const y = height - 18 - ((value - min) / range) * (height - 36);
        return <Circle key={`${value}-${index}`} cx={x} cy={y} r="4" fill={color} />;
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: '#FBF7EF'
  },
  emptyText: {
    color: colors.muted,
    fontWeight: '700'
  }
});
