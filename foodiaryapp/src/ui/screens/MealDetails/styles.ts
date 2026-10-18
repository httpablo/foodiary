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
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.support['red/10'],
    borderWidth: 1,
    borderColor: theme.colors.support.red,
  },
  errorState: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorActions: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  failedBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.support['red/10'],
    borderWidth: 1,
    borderColor: theme.colors.support.red,
    gap: 8,
  },
});
