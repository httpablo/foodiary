import { useCreateManualMeal } from '@app/hooks/mutations/useCreateManualMeal';
import { useAccount } from '@app/hooks/queries/useAccount';
import { useMeals } from '@app/hooks/queries/useMeals';
import { useSavedFoods } from '@app/hooks/queries/useSavedFoods';
import { buildPlannedFoods, PlannedFood, Portion, summarizePlannedMeal } from '@app/lib/planMeal';
import { summarizeFoods } from '@app/lib/summarizeFoods';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { SavedFood } from '@app/types/SavedFood';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { Input } from '@ui/components/Input';
import { theme } from '@ui/styles/theme';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { MinusIcon, PlusIcon } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

const portions: Portion[] = [0.5, 1, 2];
const portionLabel = (portion: Portion) => portion === 0.5 ? '½' : String(portion);
const portionDescription = (portion: Portion) => portion === 0.5 ? 'Meia porção' : portion === 1 ? 'Uma porção' : 'Duas porções';
const canUsePortion = (food: SavedFood, portion: Portion) => (
  Math.max(food.proteins, food.carbohydrates, food.fats) * portion <= 10000
);
const formatNumber = (value: number) => Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);

type Metric = 'calories' | 'proteins' | 'carbohydrates' | 'fats';
const metrics: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: 'calories', label: 'Calorias', unit: 'kcal', color: theme.colors.support.tomato },
  { key: 'proteins', label: 'Proteínas', unit: 'g', color: theme.colors.support.teal },
  { key: 'carbohydrates', label: 'Carboidratos', unit: 'g', color: theme.colors.support.yellow },
  { key: 'fats', label: 'Gorduras', unit: 'g', color: theme.colors.support.orange },
];

function ProgressRow({ label, unit, color, current, planned, goal }: {
  label: string;
  unit: string;
  color: string;
  current: number;
  planned: number;
  goal: number;
}) {
  const projected = Math.round((current + planned) * 100) / 100;
  const scale = Math.max(goal, projected, 1);
  const currentWidth = (current / scale) * 100;
  const projectedWidth = (projected / scale) * 100;
  const goalPosition = (goal / scale) * 100;
  const difference = Math.round((goal - projected) * 100) / 100;

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeading}>
        <AppText weight="medium">{label}</AppText>
        <AppText size="sm" color={theme.colors.gray[700]}>
          {formatNumber(current)} → {formatNumber(projected)} / {formatNumber(goal)} {unit}
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${projectedWidth}%`, backgroundColor: color }]} />
        <View style={[styles.progressFill, { width: `${currentWidth}%`, backgroundColor: theme.colors.gray[600] }]} />
        {goal > 0 && <View style={[styles.goalMarker, { left: `${goalPosition}%` }]} />}
      </View>
      {goal > 0 && (
        <AppText size="xs" color={difference < 0 ? theme.colors.support.red : theme.colors.gray[700]}>
          {difference < 0
            ? `Passaria ${formatNumber(Math.abs(difference))} ${unit} da meta`
            : `Restariam ${formatNumber(difference)} ${unit}`}
        </AppText>
      )}
    </View>
  );
}

export function MealPlanner() {
  const { top, bottom } = useSafeAreaInsets();
  const { goBack, navigate } = useNavigation<AppStackNavigationProps>();
  const [today] = useState(() => new Date());
  const { meals, isInitialLoading: isLoadingMeals, isError: mealsError, reloadMeals } = useMeals(today);
  const { savedFoods, isLoading: isLoadingFoods, isError: foodsError, refetch: reloadFoods } = useSavedFoods();
  const { account, isLoading: isLoadingAccount, isError: accountError, loadAccount } = useAccount();
  const { createManualMeal, isLoading: isSaving } = useCreateManualMeal();
  const [selected, setSelected] = useState<PlannedFood[]>([]);
  const [search, setSearch] = useState('');
  const [mealName, setMealName] = useState('Prato planejado');
  const isSubmitting = useRef(false);
  const consumed = useMemo(() => summarizeFoods(meals.flatMap(meal => meal.foods)), [meals]);
  const planned = useMemo(() => summarizePlannedMeal(selected), [selected]);
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const availableFoods = savedFoods.filter(food => (
    !selected.some(item => item.food.id === food.id)
    && `${food.name} ${food.quantity}`.toLocaleLowerCase('pt-BR').includes(query)
  ));
  const visibleFoods = availableFoods.slice(0, 6);
  const isLoading = isLoadingMeals || isLoadingFoods || isLoadingAccount;
  const isError = mealsError || foodsError || accountError || !account;

  function addFood(food: SavedFood) {
    if (selected.length >= 50) {
      Alert.alert('Limite de alimentos', 'Uma refeição pode ter até 50 alimentos.');
      return;
    }
    setSelected(current => [...current, { food, portion: 1 }]);
    setSearch('');
  }

  function setPortion(id: string, portion: Portion) {
    setSelected(current => current.map(item => item.food.id === id ? { ...item, portion } : item));
  }

  async function registerMeal() {
    if (isSubmitting.current) {
      return;
    }
    const name = mealName.trim();
    if (!name || name.length > 120) {
      Alert.alert('Confira a refeição', 'Informe um nome com até 120 caracteres.');
      return;
    }
    if (selected.length === 0) {
      Alert.alert('Escolha os alimentos', 'Adicione pelo menos um alimento ao prato.');
      return;
    }
    if (formatDateToAPI(new Date()) !== formatDateToAPI(today)) {
      Alert.alert('O dia mudou', 'Volte à tela inicial e abra o simulador novamente para usar as metas de hoje.');
      return;
    }

    const foods = buildPlannedFoods(selected).map(({ name: foodName, quantity, proteins, carbohydrates, fats }) => ({
      name: foodName, quantity, proteins, carbohydrates, fats,
    }));

    isSubmitting.current = true;
    try {
      await createManualMeal({
        name,
        foods,
        date: formatDateToAPI(today),
        timezoneOffsetMinutes: today.getTimezoneOffset(),
      });
      goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a refeição. Tente novamente.');
    } finally {
      isSubmitting.current = false;
    }
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <AppHeader title="Simular prato" />
      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={theme.colors.lime[700]} />
      ) : isError ? (
        <View style={styles.errorCard}>
          <AppText weight="medium">Não foi possível carregar o simulador.</AppText>
          <Button variant="secondary" onPress={() => {
            reloadMeals();
            reloadFoods();
            loadAccount();
          }}>Tentar novamente</Button>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 }]} keyboardShouldPersistTaps="handled">
            <View style={styles.intro}>
              <AppText size="2xl" weight="semiBold">E se eu comer isso?</AppText>
              <AppText color={theme.colors.gray[700]}>
                Monte seu próximo prato com alimentos salvos. A simulação não altera seu diário.
              </AppText>
            </View>

            <View style={styles.previewCard}>
              <AppText weight="semiBold">Como ficaria seu dia</AppText>
              <View style={styles.previewCalories}>
                <AppText size="3xl" weight="semiBold">{formatNumber(consumed.calories + planned.calories)}</AppText>
                <AppText color={theme.colors.gray[700]}>
                  {selected.length === 0 ? 'kcal consumidas hoje' : 'kcal com este prato'}
                </AppText>
              </View>
              <AppText size="sm" color={theme.colors.gray[700]}>
                {selected.length === 0
                  ? 'Adicione alimentos abaixo para ver o impacto nas metas.'
                  : `${formatNumber(consumed.calories)} já consumidas + ${formatNumber(planned.calories)} simuladas`}
              </AppText>
            </View>

            <View style={styles.section}>
              <AppText size="lg" weight="semiBold">Adicionar alimento salvo</AppText>
              {savedFoods.length > 0 && (
                <Input value={search} onChangeText={setSearch} placeholder="Buscar por nome ou quantidade" disabled={isSaving} />
              )}
              {availableFoods.length === 0 ? (
                savedFoods.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <AppText color={theme.colors.gray[700]}>
                      Você ainda não tem alimentos salvos. Cadastre um manualmente e toque em “Salvar alimento para reutilizar”.
                    </AppText>
                    <Button variant="secondary" onPress={() => navigate('EditMeal', {
                      mode: 'create',
                      date: formatDateToAPI(today),
                      timezoneOffsetMinutes: today.getTimezoneOffset(),
                    })}>Cadastrar alimento</Button>
                  </View>
                ) : (
                  <AppText size="sm" color={theme.colors.gray[700]}>
                    {query ? 'Nenhum alimento encontrado.' : 'Todos os alimentos salvos já estão no prato.'}
                  </AppText>
                )
              ) : visibleFoods.map(food => (
                <Pressable
                  key={food.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar ${food.name}, ${food.quantity}`}
                  disabled={isSaving}
                  onPress={() => addFood(food)}
                  style={styles.availableFood}
                >
                  <View style={styles.foodTitle}>
                    <AppText weight="medium" numberOfLines={1}>{food.name}</AppText>
                    <AppText size="sm" color={theme.colors.gray[700]} numberOfLines={1}>
                      {food.quantity} · P {formatNumber(food.proteins)}g · C {formatNumber(food.carbohydrates)}g · G {formatNumber(food.fats)}g
                    </AppText>
                  </View>
                  <PlusIcon size={20} color={theme.colors.lime[900]} />
                </Pressable>
              ))}
              {availableFoods.length > visibleFoods.length && (
                <AppText size="sm" color={theme.colors.gray[700]}>
                  Exibindo {visibleFoods.length} de {availableFoods.length}. Refine a busca para encontrar outros.
                </AppText>
              )}
            </View>

            {selected.length > 0 && (
              <View style={styles.section}>
                <AppText size="lg" weight="semiBold">Seu prato · {selected.length} {selected.length === 1 ? 'alimento' : 'alimentos'}</AppText>
                {selected.map(({ food, portion }) => (
                  <View key={food.id} style={styles.selectedCard}>
                    <View style={styles.foodHeading}>
                      <View style={styles.foodTitle}>
                        <AppText weight="semiBold" numberOfLines={2}>{food.name}</AppText>
                        <AppText size="sm" color={theme.colors.gray[700]}>{food.quantity} por porção</AppText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remover ${food.name}`}
                        disabled={isSaving}
                        onPress={() => setSelected(current => current.filter(item => item.food.id !== food.id))}
                        style={styles.iconButton}
                      >
                        <MinusIcon size={18} color={theme.colors.support.red} />
                      </Pressable>
                    </View>
                    <View style={styles.portionRow}>
                      <AppText size="sm" color={theme.colors.gray[700]}>Porções</AppText>
                      <View style={styles.portionOptions}>
                        {portions.map(option => (
                          <Pressable
                            key={option}
                            accessibilityRole="button"
                            accessibilityLabel={`${portionDescription(option)} de ${food.name}`}
                            accessibilityState={{ selected: portion === option, disabled: isSaving || !canUsePortion(food, option) }}
                            disabled={isSaving || !canUsePortion(food, option)}
                            onPress={() => setPortion(food.id, option)}
                            style={[
                              styles.portionOption,
                              portion === option && styles.portionOptionSelected,
                              !canUsePortion(food, option) && styles.portionOptionDisabled,
                            ]}
                          >
                            <AppText size="sm" weight="medium">{portionLabel(option)}×</AppText>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <AppText size="lg" weight="semiBold">Metas do dia</AppText>
              <View style={styles.metricsCard}>
                {metrics.map(metric => (
                  <ProgressRow
                    key={metric.key}
                    label={metric.label}
                    unit={metric.unit}
                    color={metric.color}
                    current={consumed[metric.key]}
                    planned={planned[metric.key]}
                    goal={account!.goal[metric.key]}
                  />
                ))}
                <AppText size="xs" color={theme.colors.gray[700]}>
                  Cinza: já consumido. Cor: prato simulado. Traço: meta.
                </AppText>
              </View>
            </View>

            {selected.length > 0 && (
              <View style={styles.section}>
                <AppText size="lg" weight="semiBold">Nome da refeição</AppText>
                <Input value={mealName} onChangeText={setMealName} maxLength={120} placeholder="Ex.: Almoço" disabled={isSaving} />
              </View>
            )}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(bottom, 16) }]}>
            <Button onPress={registerMeal} isLoading={isSaving} disabled={selected.length === 0}>
              Registrar refeição
            </Button>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
