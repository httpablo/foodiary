import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginTop: -16,
  },
  divider: {
    backgroundColor: theme.colors.gray[200],
    width: '100%',
    height: 1,
    marginTop: 12,
    marginBottom: 20,
  },
  weeklyLink: {
    marginHorizontal: 12,
    marginTop: 20,
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.lime['700/10'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plannerLink: {
    marginHorizontal: 12,
    marginTop: 20,
    padding: 16,
    minHeight: 76,
    borderRadius: 16,
    backgroundColor: theme.colors.lime[400],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  plannerLinkText: { flex: 1, gap: 4 },
  mealsLabel: {
    letterSpacing: 1.28,
    paddingHorizontal: 12,
  },
});
