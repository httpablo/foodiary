import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  errorCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.support['red/10'],
    borderWidth: 1,
    borderColor: theme.colors.support.red,
    gap: 12,
  },
});
