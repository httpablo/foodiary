import { useCreateManualMeal } from '@app/hooks/mutations/useCreateManualMeal';
import { useSaveFood } from '@app/hooks/mutations/useSaveFood';
import { parseNutrient } from '@app/lib/parseNutrient';
import { useUpdateMeal } from '@app/hooks/mutations/useUpdateMeal';
import { useRepeatMeal } from '@app/hooks/mutations/useRepeatMeal';
import { useMeal } from '@app/hooks/queries/useMeal';
import { AppStackNavigationProps, AppStackRouteProps } from '@app/navigation/AppStack';
import { MealsService } from '@app/services/MealsService';
import { MealStatus } from '@app/types/Meal';
import { SavedFood } from '@app/types/SavedFood';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { FormGroup } from '@ui/components/FormGroup';
import { Input } from '@ui/components/Input';
import { theme } from '@ui/styles/theme';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SavedFoodsPicker } from './SavedFoodsPicker';
import { styles } from './styles';

type FoodDraft = {
  id: number;
  name: string;
  quantity: string;
  proteins: string;
  carbohydrates: string;
  fats: string;
};

const emptyFood = (id: number): FoodDraft => ({
  id, name: '', quantity: '', proteins: '', carbohydrates: '', fats: '',
});

const foodToDraft = (food: Omit<SavedFood, 'id'>, id: number): FoodDraft => ({
  id,
  name: food.name,
  quantity: food.quantity,
  proteins: String(food.proteins),
  carbohydrates: String(food.carbohydrates),
  fats: String(food.fats),
});

function parseFood(food: FoodDraft): MealsService.UpdateMealPayload['foods'][number] | null {
  const name = food.name.trim();
  const quantity = food.quantity.trim();
  const proteins = parseNutrient(food.proteins);
  const carbohydrates = parseNutrient(food.carbohydrates);
  const fats = parseNutrient(food.fats);
  if (!name || name.length > 120 || !quantity || quantity.length > 80
    || proteins === null || carbohydrates === null || fats === null) {
    return null;
  }
  return { name, quantity, proteins, carbohydrates, fats };
}

export function EditMeal() {
  const { params } = useRoute<AppStackRouteProps<'EditMeal'>>();
  const { goBack, navigate, reset } = useNavigation<AppStackNavigationProps>();
  const isCreating = params.mode === 'create';
  const isRepeating = params.mode === 'repeat';
  const mealId = 'mealId' in params ? params.mealId : undefined;
  const title = isCreating ? 'Nova refeição' : isRepeating ? 'Repetir refeição' : 'Corrigir refeição';
  const { top, bottom } = useSafeAreaInsets();
  const { meal, isLoading } = useMeal(mealId);
  const { updateMeal, isLoading: isUpdating } = useUpdateMeal(mealId);
  const { repeatMeal, isLoading: isRepeatingMeal } = useRepeatMeal(mealId);
  const { createManualMeal, isLoading: isCreatingMeal } = useCreateManualMeal();
  const { saveFood, isSavingFood } = useSaveFood();
  const isSaving = isUpdating || isRepeatingMeal || isCreatingMeal;
  const [name, setName] = useState('');
  const [foods, setFoods] = useState<FoodDraft[]>(isCreating
    ? [params.initialFood ? foodToDraft(params.initialFood, 0) : emptyFood(0)]
    : []);
  const [showSavedFoods, setShowSavedFoods] = useState(false);
  const initializedMealId = useRef<string | null>(null);
  const nextFoodId = useRef(isCreating ? 1 : 0);

  useEffect(() => {
    if (meal && initializedMealId.current !== meal.id) {
      setName(meal.name);
      setFoods(meal.foods.map(food => foodToDraft(food, nextFoodId.current++)));
      initializedMealId.current = meal.id;
    }
  }, [meal]);

  function updateFood(id: number, field: Exclude<keyof FoodDraft, 'id'>, value: string) {
    setFoods(current => current.map(food => (
      food.id === id ? { ...food, [field]: value } : food
    )));
  }

  function addSavedFood(food: SavedFood) {
    if (foods.length >= 50) {
      Alert.alert('Limite de alimentos', 'Uma refeição pode ter até 50 alimentos.');
      return;
    }
    const draft = foodToDraft(food, nextFoodId.current++);
    setFoods(current => (
      isCreating && current.length === 1
        && !current[0].name.trim() && !current[0].quantity.trim()
        && !current[0].proteins.trim() && !current[0].carbohydrates.trim() && !current[0].fats.trim()
        ? [draft] : [...current, draft]
    ));
    setShowSavedFoods(false);
  }

  async function saveDraftFood(food: FoodDraft) {
    const parsed = parseFood(food);
    if (!parsed) {
      Alert.alert('Confira o alimento', 'Preencha nome, quantidade e nutrientes antes de salvar.');
      return;
    }
    try {
      await saveFood(parsed);
      Alert.alert('Alimento salvo', 'Você pode reutilizá-lo em outras refeições.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o alimento.');
    }
  }

  async function save() {
    if (!name.trim() || name.trim().length > 120) {
      Alert.alert('Confira a refeição', 'Informe um nome com até 120 caracteres.');
      return;
    }
    if (foods.length < 1 || foods.length > 50) {
      Alert.alert('Confira a refeição', 'Inclua pelo menos um alimento.');
      return;
    }
    const parsedFoods: MealsService.UpdateMealPayload['foods'] = [];
    for (const food of foods) {
      const parsed = parseFood(food);
      if (!parsed) {
        Alert.alert('Confira os alimentos', 'Preencha nome, quantidade e nutrientes de cada alimento. Use valores entre 0 e 10000, com até duas casas decimais.');
        return;
      }
      parsedFoods.push(parsed);
    }

    try {
      const payload = {
        name: name.trim(),
        foods: parsedFoods,
      };
      if (isCreating) {
        await createManualMeal({ ...payload, date: params.date, timezoneOffsetMinutes: params.timezoneOffsetMinutes });
        goBack();
      } else if (isRepeating) {
        const mealId = await repeatMeal(payload);
        reset({
          index: 1,
          routes: [{ name: 'Home' }, { name: 'MealDetails', params: { mealId } }],
        });
      } else {
        await updateMeal(payload);
        goBack();
      }
    } catch {
      Alert.alert('Erro', isCreating
        ? 'Não foi possível cadastrar a refeição.'
        : isRepeating ? 'Não foi possível repetir a refeição.' : 'Não foi possível salvar a refeição.');
    }
  }

  if (!isCreating && !meal && !isLoading) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <AppHeader title={title} />
        <AppText style={styles.message}>Refeição não encontrada.</AppText>
      </View>
    );
  }

  if (!isCreating && !meal) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <AppHeader title={title} />
        <ActivityIndicator style={styles.message} color={theme.colors.black[700]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <AppHeader title={title} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormGroup label="Nome da refeição">
            <Input value={name} onChangeText={setName} maxLength={120} placeholder="Ex.: Almoço" />
          </FormGroup>
          <AppText color={theme.colors.gray[700]}>
            {isCreating
              ? `Adicione os alimentos consumidos em ${params.date.split('-').reverse().join('/')}. As calorias são calculadas a partir dos nutrientes.`
              : isRepeating
              ? 'Revise os alimentos e as quantidades antes de adicionar esta refeição a hoje. As calorias são calculadas a partir dos nutrientes.'
              : 'As calorias são calculadas a partir das proteínas, carboidratos e gorduras.'}
          </AppText>

          <Button variant="secondary" onPress={() => setShowSavedFoods(value => !value)}>
            {showSavedFoods ? 'Ocultar alimentos salvos' : 'Usar alimento salvo'}
          </Button>
          <Button variant="secondary" onPress={() => {
            setShowSavedFoods(true);
            navigate('NutritionLabelScanner');
          }}>
            Escanear rótulo
          </Button>
          {showSavedFoods && <SavedFoodsPicker onSelect={addSavedFood} disabled={isSaving} />}

          {foods.map((food, index) => (
            <View key={food.id} style={styles.foodCard}>
              <View style={styles.foodHeader}>
                <AppText weight="semiBold">Alimento {index + 1}</AppText>
                {foods.length > 1 && (
                  <Button
                    variant="ghost"
                    onPress={() => setFoods(current => current.filter(item => item.id !== food.id))}
                    disabled={isSaving}
                  >
                    <AppText color={theme.colors.support.red}>Remover</AppText>
                  </Button>
                )}
              </View>
              <FormGroup label="Nome">
                <Input value={food.name} onChangeText={value => updateFood(food.id, 'name', value)} maxLength={120} placeholder="Ex.: Arroz" />
              </FormGroup>
              <FormGroup label="Quantidade">
                <Input value={food.quantity} onChangeText={value => updateFood(food.id, 'quantity', value)} maxLength={80} placeholder="Ex.: 100 g" />
              </FormGroup>
              <View style={styles.nutrients}>
                <View style={styles.nutrient}>
                  <FormGroup label="Proteínas">
                    <Input value={food.proteins} onChangeText={value => updateFood(food.id, 'proteins', value)} keyboardType="decimal-pad" suffix="g" />
                  </FormGroup>
                </View>
                <View style={styles.nutrient}>
                  <FormGroup label="Carboidratos">
                    <Input value={food.carbohydrates} onChangeText={value => updateFood(food.id, 'carbohydrates', value)} keyboardType="decimal-pad" suffix="g" />
                  </FormGroup>
                </View>
                <View style={styles.nutrient}>
                  <FormGroup label="Gorduras">
                    <Input value={food.fats} onChangeText={value => updateFood(food.id, 'fats', value)} keyboardType="decimal-pad" suffix="g" />
                  </FormGroup>
                </View>
              </View>
              <Button variant="ghost" onPress={() => saveDraftFood(food)} disabled={isSaving || isSavingFood}>
                <AppText color={theme.colors.lime[900]} weight="medium">Salvar alimento para reutilizar</AppText>
              </Button>
            </View>
          ))}
          <Button variant="secondary" onPress={() => setFoods(current => [...current, emptyFood(nextFoodId.current++)])} disabled={foods.length >= 50 || isSaving}>
            Adicionar alimento
          </Button>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(bottom, 16) }]}>
          <Button onPress={save} isLoading={isSaving} disabled={!isCreating && (meal?.status !== MealStatus.SUCCESS || !initializedMealId.current)}>
            {isCreating ? 'Cadastrar refeição' : isRepeating ? 'Adicionar a hoje' : 'Salvar alterações'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
