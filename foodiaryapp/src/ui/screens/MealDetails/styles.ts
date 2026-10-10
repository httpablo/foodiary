import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  food: {
    marginHorizontal: 20,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[400],
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[400],
  },
  action: {
    flex: 1,
    minHeight: 52,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
