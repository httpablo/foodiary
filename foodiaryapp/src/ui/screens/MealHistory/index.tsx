import { summarizeFoods } from '@app/lib/summarizeFoods';
import { useMealHistory } from '@app/hooks/queries/useMealHistory';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import { ChevronRightIcon } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

const formatDate = (date: Date) => Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(date);

export function MealHistory() {
  const { top, bottom } = useSafeAreaInsets();
  const { navigate } = useNavigation<AppStackNavigationProps>();
  const history = useMealHistory();
  const meals = history.data?.pages.flatMap(page => page.meals) ?? [];

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <AppHeader title="Histórico de refeições" />
      <FlatList
        data={meals}
        keyExtractor={meal => meal.id}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={history.isRefetching && !history.isFetchingNextPage} onRefresh={() => history.refetch()} />}
        ListHeaderComponent={(
          <View style={styles.intro}>
            <AppText size="2xl" weight="semiBold">Suas refeições</AppText>
            <AppText color={theme.colors.gray[700]}>Consulte seus registros, dos mais recentes aos mais antigos. Toque para ver ou editar.</AppText>
          </View>
        )}
        ListEmptyComponent={history.isPending ? (
          <ActivityIndicator accessibilityLabel="Carregando histórico" color={theme.colors.lime[700]} />
        ) : !history.isError ? (
          <View style={styles.message}>
            <AppText weight="medium">Seu histórico começa com a primeira refeição.</AppText>
            <AppText color={theme.colors.gray[700]}>Cadastre uma refeição na tela inicial para encontrá-la aqui.</AppText>
            <Button variant="secondary" onPress={() => navigate('Home')}>Ir para o início</Button>
          </View>
        ) : null}
        ListFooterComponent={(
          <View style={styles.footer}>
            {history.isError && (
              <View style={styles.message} accessibilityLiveRegion="polite">
                <AppText>Não foi possível carregar {history.isFetchNextPageError ? 'mais refeições' : 'o histórico'}. Tente novamente.</AppText>
                <Button variant="secondary" onPress={() => history.isFetchNextPageError ? history.fetchNextPage() : history.refetch()}>
                  Tentar novamente
                </Button>
              </View>
            )}
            {!history.isError && history.hasNextPage && (
              <Button variant="secondary" isLoading={history.isFetchingNextPage} onPress={() => history.fetchNextPage()}>
                Carregar mais refeições
              </Button>
            )}
            {!history.hasNextPage && meals.length > 0 && !history.isError && (
              <AppText size="sm" align="center" color={theme.colors.gray[700]}>Você chegou ao início do seu histórico.</AppText>
            )}
          </View>
        )}
        renderItem={({ item: meal }) => {
          const totals = summarizeFoods(meal.foods);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${meal.name}, ${formatDate(meal.createdAt)}, ${totals.calories} quilocalorias. Ver detalhes`}
              onPress={() => navigate('MealDetails', { mealId: meal.id })}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            >
              <AppText size="sm" color={theme.colors.gray[700]}>{formatDate(meal.createdAt)}</AppText>
              <View style={styles.row}>
                <AppText size="xl" accessible={false}>{meal.icon || '🍽️'}</AppText>
                <View style={styles.details}>
                  <AppText weight="semiBold">{meal.name}</AppText>
                  <AppText size="sm" color={theme.colors.gray[700]} numberOfLines={2}>{meal.foods.map(food => food.name).join(', ')}</AppText>
                </View>
                <ChevronRightIcon size={20} color={theme.colors.lime[900]} />
              </View>
              <View style={styles.nutrients}>
                <AppText size="sm" weight="medium">{totals.calories} kcal</AppText>
                <AppText size="sm">Proteínas: {totals.proteins} g</AppText>
                <AppText size="sm">Carboidratos: {totals.carbohydrates} g</AppText>
                <AppText size="sm">Gorduras: {totals.fats} g</AppText>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
