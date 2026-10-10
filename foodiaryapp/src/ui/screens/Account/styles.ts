import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profile: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 40,
    paddingBottom: 40,
  },
  actionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footer: {
    paddingHorizontal: 20,
  },
});
