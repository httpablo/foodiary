import { theme } from '@ui/styles/theme';
import { useMemo } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Arc } from './Arc';
import { styles } from './styles';
import { MacroProgress } from './types';
import { calcMacroPercentage, formatMacro } from './utils';

export interface IGoalArcsProps {
  calories: MacroProgress;
  proteins: MacroProgress;
  carbohydrates: MacroProgress;
  fats: MacroProgress;
  variant?: 'light' | 'dark';
}

export function GoalStats({
  calories,
  carbohydrates,
  fats,
  proteins,
  variant = 'light',
}: IGoalArcsProps) {
  const { width } = useWindowDimensions();
  const strokeWidth = 12;
  const outerRadius = Math.max(96, Math.min(160, (width - 32 - strokeWidth) / 2));
  const isDark = variant === 'dark';
  const percentages = useMemo(() => ({
    calories: calcMacroPercentage(calories),
    carbohydrates: calcMacroPercentage(carbohydrates),
    fats: calcMacroPercentage(fats),
    proteins: calcMacroPercentage(proteins),
  }), [calories, carbohydrates, fats, proteins]);

  return (
    <View style={styles.container}>
      <View style={[styles.arcsContainer, { minHeight: outerRadius + strokeWidth }]}>
        <Arc
          percentage={percentages.calories}
          color={theme.colors.support.tomato}
          radius={outerRadius}
          strokeWidth={strokeWidth}
        />
        <Arc
          percentage={percentages.proteins}
          color={theme.colors.support.teal}
          radius={outerRadius - 20}
          strokeWidth={strokeWidth}
          style={styles.proteinArc}
        />
        <Arc
          percentage={percentages.carbohydrates}
          color={theme.colors.support.yellow}
          radius={outerRadius - 40}
          strokeWidth={strokeWidth}
          style={styles.carbohydrateArc}
        />
        <Arc
          percentage={percentages.fats}
          color={theme.colors.support.orange}
          radius={outerRadius - 60}
          strokeWidth={strokeWidth}
          style={styles.fatArc}
        />
      </View>

      <View style={styles.caloriesTextContainer}>
        <Text style={styles.caloriesLine}>
          <Text style={[styles.caloriesValue, isDark && styles.caloriesValueDark]}>
            {formatMacro(calories)}
          </Text>
          {calories.current !== undefined && (
            <Text style={[styles.caloriesGoal, isDark && styles.secondaryTextDark]}>
              {' '}/ {calories.goal}
            </Text>
          )}
        </Text>

        <Text style={[styles.caloriesLabel, isDark && styles.secondaryTextDark]}>
          Calorias
        </Text>
      </View>

      <View style={styles.macrosContainer}>
        <View style={styles.macroItem}>
          <Text style={[styles.proteinValue, isDark && styles.proteinValueDark]}>
            {formatMacro(proteins)}g
            {proteins.current !== undefined && (
              <Text style={[styles.macroGoal, isDark && styles.secondaryTextDark]}>
                {' '}/ {proteins.goal}g
              </Text>
            )}
          </Text>
          <Text style={[styles.macroLabel, isDark && styles.secondaryTextDark]}>Proteínas</Text>
        </View>

        <View style={styles.macroItem}>
          <Text style={[styles.carbohydrateValue, isDark && styles.carbohydrateValueDark]}>
            {formatMacro(carbohydrates)}g
            {carbohydrates.current !== undefined && (
              <Text style={[styles.macroGoal, isDark && styles.secondaryTextDark]}>
                {' '}/ {carbohydrates.goal}g
              </Text>
            )}
          </Text>
          <Text style={[styles.macroLabel, isDark && styles.secondaryTextDark]}>Carboidratos</Text>
        </View>

        <View style={styles.macroItem}>
          <Text style={[styles.fatValue, isDark && styles.fatValueDark]}>
            {formatMacro(fats)}g
            {fats.current !== undefined && (
              <Text style={[styles.macroGoal, isDark && styles.secondaryTextDark]}>
                {' '}/ {fats.goal}g
              </Text>
            )}
          </Text>
          <Text style={[styles.macroLabel, isDark && styles.secondaryTextDark]}>Gorduras</Text>
        </View>
      </View>
    </View>
  );
}
