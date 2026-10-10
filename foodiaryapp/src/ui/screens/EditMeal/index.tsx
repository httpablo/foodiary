import { useUpdateMeal } from '@app/hooks/mutations/useUpdateMeal';
import { useRepeatMeal } from '@app/hooks/mutations/useRepeatMeal';
import { useMeal } from '@app/hooks/queries/useMeal';
import { AppStackNavigationProps, AppStackRouteProps } from '@app/navigation/AppStack';
import { MealsService } from '@app/services/MealsService';
import { MealStatus } from '@app/types/Meal';
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

function parseNutrient(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const number = Number(normalized);
  return Number.isFinite(number) && number <= 10000 ? number : null;
}

export function EditMeal() {
  const { params } = useRoute<AppStackRouteProps<'EditMeal'>>();
  const { goBack, reset } = useNavigation<AppStackNavigationProps>();
  const isRepeating = params.mode === 'repeat';
  const title = isRepeating ? 'Repetir refeição' : 'Corrigir refeição';
  const { top, bottom } = useSafeAreaInsets();
  const { meal, isLoading } = useMeal(params.mealId);
  const { updateMeal, isLoading: isUpdating } = useUpdateMeal(params.mealId);
  const { repeatMeal, isLoading: isRepeatingMeal } = useRepeatMeal(params.mealId);
  const isSaving = isUpdating || isRepeatingMeal;
  const [name, setName] = useState('');
  const [foods, setFoods] = useState<FoodDraft[]>([]);
  const initializedMealId = useRef<string | null>(null);
  const nextFoodId = useRef(0);

  useEffect(() => {
    if (meal && initializedMealId.current !== meal.id) {
      setName(meal.name);
      setFoods(meal.foods.map(food => ({
        id: nextFoodId.current++,
        name: food.name,
        quantity: food.quantity,
        proteins: String(food.proteins),
        carbohydrates: String(food.carbohydrates),
        fats: String(food.fats),
      })));
      initializedMealId.current = meal.id;
    }
  }, [meal]);

  function updateFood(id: number, field: Exclude<keyof FoodDraft, 'id'>, value: string) {
    setFoods(current => current.map(food => (
      food.id === id ? { ...food, [field]: value } : food
    )));
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
      const foodName = food.name.trim();
      const quantity = food.quantity.trim();
      const proteins = parseNutrient(food.proteins);
      const carbohydrates = parseNutrient(food.carbohydrates);
      const fats = parseNutrient(food.fats);
      if (!foodName || foodName.length > 120 || !quantity || quantity.length > 80
        || proteins === null || carbohydrates === null || fats === null) {
        Alert.alert('Confira os alimentos', 'Preencha nome, quantidade e nutrientes de cada alimento. Use valores entre 0 e 10000, com até duas casas decimais.');
        return;
      }
      parsedFoods.push({ name: foodName, quantity, proteins, carbohydrates, fats });
    }

    try {
      const payload = {
        name: name.trim(),
        foods: parsedFoods,
      };
      if (isRepeating) {
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
      Alert.alert('Erro', isRepeating
        ? 'Não foi possível repetir a refeição.'
        : 'Não foi possível salvar a refeição.');
    }
  }

  if (!meal && !isLoading) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <AppHeader title={title} />
        <AppText style={styles.message}>Refeição não encontrada.</AppText>
      </View>
    );
  }

  if (!meal) {
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
            {isRepeating
              ? 'Revise os alimentos e as quantidades antes de adicionar esta refeição a hoje. As calorias são calculadas a partir dos nutrientes.'
              : 'As calorias são calculadas a partir das proteínas, carboidratos e gorduras.'}
          </AppText>

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
            </View>
          ))}
          <Button variant="secondary" onPress={() => setFoods(current => [...current, emptyFood(nextFoodId.current++)])} disabled={foods.length >= 50 || isSaving}>
            Adicionar alimento
          </Button>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(bottom, 16) }]}>
          <Button onPress={save} isLoading={isSaving} disabled={meal?.status !== MealStatus.SUCCESS || !initializedMealId.current}>
            {isRepeating ? 'Adicionar a hoje' : 'Salvar alterações'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
