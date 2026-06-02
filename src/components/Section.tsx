import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    marginBottom: 22
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900'
  }
});
