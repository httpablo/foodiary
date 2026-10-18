import { theme } from '@ui/styles/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcsContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  proteinArc: {
    position: 'absolute',
    top: 20,
  },
  carbohydrateArc: {
    position: 'absolute',
    top: 40,
  },
  fatArc: {
    position: 'absolute',
    top: 60,
  },
  caloriesTextContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesLine: {
    textAlign: 'center',
  },
  caloriesValue: {
    fontFamily: theme.fontFamily.sans.semiBold,
    color: theme.colors.supportText.tomato,
    fontSize: theme.fontSize.xl,
  },
  caloriesValueDark: {
    color: theme.colors.support.tomato,
  },
  caloriesGoal: {
    fontSize: theme.fontSize.base,
    color: theme.colors.gray[700],
  },
  caloriesLabel: {
    color: theme.colors.gray[700],
    marginTop: 4,
    textAlign: 'center',
    fontFamily: theme.fontFamily.sans.regular,
    fontSize: theme.fontSize.sm,
  },
  macrosContainer: {
    padding: 16,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  macroItem: {
    alignItems: 'center',
    minWidth: 84,
    flexGrow: 1,
    flexShrink: 0,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  proteinValue: {
    fontFamily: theme.fontFamily.sans.semiBold,
    color: theme.colors.supportText.teal,
    fontSize: theme.fontSize.base,
    textAlign: 'center',
  },
  proteinValueDark: {
    color: theme.colors.support.teal,
  },
  carbohydrateValue: {
    fontFamily: theme.fontFamily.sans.semiBold,
    color: theme.colors.supportText.yellow,
    fontSize: theme.fontSize.base,
    textAlign: 'center',
  },
  carbohydrateValueDark: {
    color: theme.colors.support.yellow,
  },
  fatValue: {
    fontFamily: theme.fontFamily.sans.semiBold,
    color: theme.colors.supportText.orange,
    fontSize: theme.fontSize.base,
    textAlign: 'center',
  },
  fatValueDark: {
    color: theme.colors.support.orange,
  },
  macroGoal: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
  },
  macroLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray[700],
    textAlign: 'center',
  },
  secondaryTextDark: {
    color: theme.colors.gray[400],
  },
});
