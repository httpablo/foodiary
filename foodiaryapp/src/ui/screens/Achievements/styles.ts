import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 24 },
  intro: { gap: 6 },
  loading: { marginTop: 80 },
  errorCard: { gap: 20, padding: 20, borderRadius: 16, backgroundColor: theme.colors.gray[100] },
  heroCard: { backgroundColor: theme.colors.lime[400], borderRadius: 20, padding: 20, gap: 12 },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: theme.colors['white/40'] },
  progressFill: { height: 7, borderRadius: 4, backgroundColor: theme.colors.lime[700] },
  section: { gap: 14 },
  list: { gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.gray[400],
  },
  itemLocked: { borderColor: theme.colors.gray[200], backgroundColor: theme.colors.gray[100] },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.lime[400],
  },
  itemIconLocked: { backgroundColor: theme.colors.gray[200] },
  itemText: { flex: 1, gap: 2 },
});
