import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 20 },
  intro: { gap: 8 },
  photo: { width: '100%', height: 220, borderRadius: 16, backgroundColor: theme.colors.gray[200] },
  reviewPhoto: { width: '100%', height: 152, borderRadius: 16, backgroundColor: theme.colors.gray[200] },
  actions: { gap: 10 },
  compactActions: { flexDirection: 'row', gap: 8 },
  compactAction: { flex: 1, minWidth: 0 },
  compactButton: { paddingHorizontal: 8 },
  loadingCard: { padding: 24, borderRadius: 16, backgroundColor: theme.colors.gray[100], alignItems: 'center', gap: 12 },
  errorCard: { padding: 16, borderRadius: 16, backgroundColor: theme.colors.support['red/10'] },
  tipCard: { padding: 18, borderRadius: 16, backgroundColor: theme.colors.gray[100], borderWidth: 1, borderColor: theme.colors.gray[300], gap: 8 },
  review: { gap: 18 },
  reviewHeader: { gap: 4 },
  calorieCard: { padding: 16, borderRadius: 16, backgroundColor: theme.colors.gray[100], gap: 8 },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.gray[400], gap: 10 },
  successContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 48, gap: 16 },
  successIcon: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.lime[400], alignItems: 'center', justifyContent: 'center' },
  successActions: { marginTop: 24, gap: 10 },
});
