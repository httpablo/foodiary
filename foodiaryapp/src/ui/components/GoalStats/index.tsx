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
}

export function GoalStats({
  calories,
  carbohydrates,
  fats,
  proteins,
}: IGoalArcsProps) {
  const { width } = useWindowDimensions();
  const strokeWidth = 12;
  const outerRadius = Math.min(160, (width - 32 - strokeWidth) / 2);
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

        <View style={styles.caloriesTextContainer}>
          <Text>
            <Text style={styles.caloriesValue}>
              {formatMacro(calories)}
            </Text>
            {calories.current !== undefined && (
              <Text style={styles.caloriesGoal}> / {calories.goal}</Text>
            )}
          </Text>

          <Text style={styles.caloriesLabel}>
            Calorias
          </Text>
        </View>
      </View>

      <View style={styles.macrosContainer}>
        <View style={styles.macroItem}>
          <Text style={styles.proteinValue}>
            {formatMacro(proteins)}g
            {proteins.current !== undefined && (
              <Text style={styles.macroGoal}> / {proteins.goal}g</Text>
            )}
          </Text>
          <Text style={styles.macroLabel}>Proteínas</Text>
        </View>

        <View style={styles.macroItem}>
          <Text style={styles.carbohydrateValue}>
            {formatMacro(carbohydrates)}g
            {carbohydrates.current !== undefined && (
              <Text style={styles.macroGoal}> / {carbohydrates.goal}g</Text>
            )}
          </Text>
          <Text style={styles.macroLabel}>Carboidratos</Text>
        </View>

        <View style={styles.macroItem}>
          <Text style={styles.fatValue}>
            {formatMacro(fats)}g
            {fats.current !== undefined && (
              <Text style={styles.macroGoal}> / {fats.goal}g</Text>
            )}
          </Text>
          <Text style={styles.macroLabel}>Gorduras</Text>
        </View>
      </View>
    </View>
  );
}
