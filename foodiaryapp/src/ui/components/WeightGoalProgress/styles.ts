import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { gap: 8 },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  valueBox: { flex: 1, minWidth: 0 },
  valueBoxCenter: { alignItems: 'center' },
  valueBoxEnd: { alignItems: 'flex-end' },
  track: {
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.lime[700],
    overflow: 'hidden',
  },
  trackCompact: { height: 8, borderRadius: 4 },
  fill: { height: '100%', backgroundColor: theme.colors.lime[700] },
});
