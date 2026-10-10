import { useMeal } from '@app/hooks/queries/useMeal';
import { useDeleteMeal } from '@app/hooks/mutations/useDeleteMeal';
import { AppStackNavigationProps, AppStackRouteProps } from '@app/navigation/AppStack';
import { MealStatus } from '@app/types/Meal';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import { Skeleton } from 'moti/skeleton';
import { Alert, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from './components/Header';
import { styles } from './styles';

export function MealDetails() {
  const { params } = useRoute<AppStackRouteProps<'MealDetails'>>();
  const { meal, isLoading } = useMeal(params.mealId);
  const { navigate, goBack } = useNavigation<AppStackNavigationProps>();
  const { bottom } = useSafeAreaInsets();
  const { deleteMeal, isLoading: isDeleting } = useDeleteMeal(params.mealId);

  function confirmDelete() {
    Alert.alert('Excluir refeição?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeal();
            goBack();
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir a refeição.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={meal?.foods ?? []}
        ListHeaderComponent={<Header meal={meal} isLoading={isLoading} />}
        ListEmptyComponent={(
          !isLoading ? null : (
            <>
              <View style={styles.food}>
                <Skeleton width="100%" height={24} colorMode="light" />
              </View>
              <View style={styles.food}>
                <Skeleton width="100%" height={24} colorMode="light" />
              </View>
              <View style={styles.food}>
                <Skeleton width="100%" height={24} colorMode="light" />
              </View>
            </>
          )
        )}
        renderItem={({ item: food }) => (
          <View style={styles.food}>
            <AppText>{food.quantity} {food.name}</AppText>
          </View>
        )}
      />
      {meal?.status === MealStatus.SUCCESS && (
        <View style={[styles.actions, { paddingBottom: Math.max(bottom, 16) }]}>
          <View style={styles.actionRow}>
            <View style={styles.action}>
              <Button onPress={() => navigate('EditMeal', { mealId: meal.id, mode: 'repeat' })} disabled={isDeleting}>
                Repetir
              </Button>
            </View>
            <View style={styles.action}>
              <Button variant="secondary" onPress={() => navigate('EditMeal', { mealId: meal.id })} disabled={isDeleting}>
                Corrigir
              </Button>
            </View>
          </View>
          <Button variant="ghost" onPress={confirmDelete} isLoading={isDeleting}>
            <AppText color={theme.colors.support.red} weight="medium">Excluir refeição</AppText>
          </Button>
        </View>
      )}
    </View>
  );
}
