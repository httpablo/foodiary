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
  actions: { gap: 12 },
  reminderCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.gray[400],
    gap: 16,
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderText: { flex: 1, gap: 4 },
  hours: { flexDirection: 'row', gap: 6 },
  hour: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: theme.colors.gray[200],
  },
  hourSelected: { backgroundColor: theme.colors.lime[500] },
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
