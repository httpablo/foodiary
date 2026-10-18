import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { summarizeFoods } from '@app/lib/summarizeFoods';
import { SimplifiedMeal } from '@app/types/Meal';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import { useMemo } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useHomeContext } from '../../context/useHomeContext';
import { styles } from './styles';

interface IMealCardProps {
  meal: SimplifiedMeal;
}

export function MealCard({ meal }: IMealCardProps) {
  const { fontScale } = useWindowDimensions();
  const { isLoading } = useHomeContext();
  const { navigate } = useNavigation<AppStackNavigationProps>();

  const formattedFoods = useMemo(() => (
    meal.foods.map(food => food.name).join(', ')
  ), [meal.foods]);

  const summary = useMemo(() => summarizeFoods(meal.foods), [meal.foods]);

  return (
    <View style={[styles.container, { opacity: isLoading ? 0.5 : 1 }]}>
      <AppText color={theme.colors.gray[700]}>
        {formatTime(meal.createdAt)}
      </AppText>

      <View style={styles.wrapper}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading }}
          onPress={() => navigate('MealDetails', { mealId: meal.id })}
          disabled={isLoading}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', foreground: true }}
          style={({ pressed }) => [
            styles.card,
            pressed && Platform.OS === 'ios' && { opacity: 0.5 },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.icon}>
              <AppText>{meal.icon}</AppText>
            </View>

            <View style={styles.mealDetails}>
              <AppText
                color={theme.colors.gray[700]}
                size="sm"
                numberOfLines={1}
              >
                {meal.name}
              </AppText>
              <AppText weight="medium" numberOfLines={1}>
                {formattedFoods}
              </AppText>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.mealStatsRow}>
              <View style={[styles.mealStat, { flexBasis: 120 * fontScale }]}>
                <AppText style={styles.statText} color={theme.colors.support.tomato} weight="medium">
                  {summary.calories}
                </AppText>
                <AppText style={styles.statText} color={theme.colors.gray[700]}>
                  Kcal
                </AppText>
              </View>

              <View style={[styles.mealStat, { flexBasis: 120 * fontScale }]}>
                <AppText style={styles.statText} color={theme.colors.support.teal} weight="medium">
                  {summary.proteins}g
                </AppText>
                <AppText style={styles.statText} color={theme.colors.gray[700]}>
                  Proteínas
                </AppText>
              </View>
            </View>

            <View style={styles.mealStatsRow}>
              <View style={[styles.mealStat, { flexBasis: 120 * fontScale }]}>
                <AppText style={styles.statText} color={theme.colors.support.yellow} weight="medium">
                  {summary.carbohydrates}g
                </AppText>
                <AppText style={styles.statText} color={theme.colors.gray[700]}>
                  Carboidratos
                </AppText>
              </View>

              <View style={[styles.mealStat, { flexBasis: 120 * fontScale }]}>
                <AppText style={styles.statText} color={theme.colors.support.orange} weight="medium">
                  {summary.fats}g
                </AppText>
                <AppText style={styles.statText} color={theme.colors.gray[700]}>
                  Gorduras
                </AppText>
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}h${minutes}`;
}
