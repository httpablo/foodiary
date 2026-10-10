import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    paddingTop: 24,
    flex: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  avatarHint: {
    color: theme.colors.gray[700],
  },
  avatarButton: {
    width: 80,
    height: 80,
  },
  cameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.black[700],
  },
  form: {
    gap: 32,
    marginBottom: 32,
    flex: 1,
    paddingHorizontal: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[400],
  },
});
