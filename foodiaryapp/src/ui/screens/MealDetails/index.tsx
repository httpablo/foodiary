import { useMeal } from '@app/hooks/queries/useMeal';
import { useDeleteMeal } from '@app/hooks/mutations/useDeleteMeal';
import { AppStackNavigationProps, AppStackRouteProps } from '@app/navigation/AppStack';
import { MealStatus } from '@app/types/Meal';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { useConfirmDialog } from '@ui/components/ConfirmDialog';
import { theme } from '@ui/styles/theme';
import { Skeleton } from 'moti/skeleton';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from './components/Header';
import { styles } from './styles';

export function MealDetails() {
  const { params } = useRoute<AppStackRouteProps<'MealDetails'>>();
  const { meal, isLoading, isError, refetch } = useMeal(params.mealId);
  const { navigate, goBack } = useNavigation<AppStackNavigationProps>();
  const { top, bottom } = useSafeAreaInsets();
  const { deleteMeal, isLoading: isDeleting } = useDeleteMeal(params.mealId);
  const { confirm } = useConfirmDialog();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function confirmDelete() {
    setDeleteError(null);
    void confirm({
      title: 'Excluir refeição?',
      message: 'Essa ação não pode ser desfeita.',
      cancelLabel: 'Cancelar',
      confirmLabel: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteMeal();
          goBack();
        } catch {
          setDeleteError('Não foi possível excluir a refeição. Tente novamente.');
        }
      },
    });
  }

  if (!isLoading && (isError || !meal)) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <AppHeader title="Refeição" />
        <View
          style={styles.errorState}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <AppText size="lg" weight="semiBold" align="center">
            Não foi possível carregar os detalhes da refeição.
          </AppText>
          <View style={styles.errorActions}>
            <Button onPress={() => void refetch()}>
              Tentar novamente
            </Button>
            <Button variant="secondary" onPress={goBack}>
              Voltar
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={meal?.foods ?? []}
        ListHeaderComponent={(
          <>
            <Header meal={meal} isLoading={isLoading} />
            {meal?.status === MealStatus.FAILED && (
              <View
                style={styles.failedBanner}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <AppText weight="medium" color={theme.colors.support.red}>
                  Não foi possível processar esta refeição automaticamente.
                </AppText>
                <AppText size="sm" color={theme.colors.gray[700]}>
                  Você pode editar os alimentos manualmente ou excluir esta refeição.
                </AppText>
              </View>
            )}
          </>
        )}
        ListEmptyComponent={(
          !isLoading ? null : (
            <View>
              <View style={styles.food}>
                <Skeleton width="100%" height={24} colorMode="light" />
              </View>
              <View style={styles.food}>
                <Skeleton width="100%" height={24} colorMode="light" />
              </View>
              <View style={styles.food}>
                <Skeleton width="100%" height={24} colorMode="light" />
              </View>
            </View>
          )
        )}
        renderItem={({ item: food }) => (
          <View style={styles.food}>
            <AppText>{food.quantity} {food.name}</AppText>
          </View>
        )}
      />
      {(meal?.status === MealStatus.SUCCESS || meal?.status === MealStatus.FAILED) && (
        <View style={[styles.actions, { paddingBottom: Math.max(bottom, 16) }]}>
          {deleteError && (
            <View
              style={styles.errorBanner}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <AppText size="sm" color={theme.colors.support.red}>
                {deleteError}
              </AppText>
            </View>
          )}
          {meal.status === MealStatus.SUCCESS ? (
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
          ) : (
            <Button
              variant="secondary"
              onPress={() => navigate('EditMeal', { mealId: meal.id })}
              disabled={isDeleting}
            >
              Editar manualmente
            </Button>
          )}
          <Button variant="ghost" onPress={confirmDelete} isLoading={isDeleting}>
            <AppText color={theme.colors.support.red} weight="medium">Excluir refeição</AppText>
          </Button>
        </View>
      )}
    </View>
  );
}
