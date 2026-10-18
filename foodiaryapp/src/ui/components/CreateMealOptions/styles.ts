import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  mediaOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  buttonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonWrapperMedia: { flex: 1 },
  buttonWrapperHorizontal: { width: '100%' },
  button: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  buttonHorizontal: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  icon: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.gray[200],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    letterSpacing: -0.16,
    flexShrink: 1,
  },
});
