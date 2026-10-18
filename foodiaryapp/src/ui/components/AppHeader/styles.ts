import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: theme.colors.white,
  },
  title: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
    paddingVertical: 12,
  },
  rightAction: {
    marginLeft: 8,
    width: 48,
    height: 48,
  },
});
