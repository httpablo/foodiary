import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 16,
    padding: 16,
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: theme.colors.gray[200],
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: { flex: 1, gap: 4 },
  label: { letterSpacing: 1.28 },
  values: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
  fill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.lime[700],
  },
});
