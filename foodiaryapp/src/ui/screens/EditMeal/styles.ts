import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  flex: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 32 },
  foodCard: {
    borderWidth: 1,
    borderColor: theme.colors.gray[400],
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  foodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nutrients: { gap: 12 },
  nutrient: { flex: 1 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[400],
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  message: { margin: 20 },
});
