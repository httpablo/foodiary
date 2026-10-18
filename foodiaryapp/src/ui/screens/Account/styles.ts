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
    gap: 12,
  },
  feedbackBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.support['red/10'],
    borderWidth: 1,
    borderColor: theme.colors.support.red,
  },
});
