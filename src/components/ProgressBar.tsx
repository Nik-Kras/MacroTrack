import { DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  label: string;
  value: number;
  target: number;
  unit: string;
  tone?: string;
  onPress?: () => void;
};

export function ProgressBar({ label, value, target, unit, tone = colors.green, onPress }: Props) {
  const ratio = target > 0 ? value / target : 0;
  const over = ratio > 1;
  const fill = `${Math.min(100, Math.max(0, ratio * 100))}%` as DimensionValue;
  const Container = onPress ? Pressable : View;

  return (
    <Container style={styles.wrap} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, over && styles.over]}>
          {Math.round(value)} / {Math.round(target)} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: fill, backgroundColor: over ? colors.coral : tone }]} />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 7
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700'
  },
  value: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  over: {
    color: colors.danger
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E7DFD0',
    overflow: 'hidden'
  },
  fill: {
    height: 10,
    borderRadius: 5
  }
});
