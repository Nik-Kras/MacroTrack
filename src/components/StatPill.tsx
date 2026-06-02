import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 76,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFE7D8',
    gap: 2
  },
  value: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900'
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700'
  }
});
