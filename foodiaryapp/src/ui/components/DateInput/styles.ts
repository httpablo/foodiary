import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.gray[400],
    borderRadius: 10,
    backgroundColor: theme.colors.white,
    color: theme.colors.black[700],
    fontFamily: theme.fontFamily.sans.regular,
    fontSize: 18,
    textAlign: 'center',
  },
  fieldError: {
    borderColor: theme.colors.support.red,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  shortField: {
    flex: 1,
    minWidth: 0,
  },
  yearField: {
    flex: 1.5,
    minWidth: 0,
  },
  separator: {
    color: theme.colors.gray[700],
    fontSize: 20,
  },
});
