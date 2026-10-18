import { StyleSheet } from 'react-native';
import { theme } from '@ui/styles/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  content: { flexGrow: 1, paddingHorizontal: 20, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  intro: { gap: 8, paddingTop: 16, paddingBottom: 8 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.gray[400], gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  details: { flex: 1, minWidth: 0, gap: 4 },
  nutrients: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 12, borderRadius: 8, backgroundColor: theme.colors.gray[200] },
  message: { gap: 16, paddingVertical: 20 },
  footer: { paddingVertical: 12 },
});
