import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  title: {
    color: theme.colors.black[700],
  },
  message: {
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionWrapper: {
    flex: 1,
  },
  actionButton: {
    width: '100%',
  },
  destructiveButton: {
    backgroundColor: theme.colors.support.red,
    borderColor: theme.colors.support.red,
  },
});
