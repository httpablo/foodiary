import { useSaveFood } from '@app/hooks/mutations/useSaveFood';
import { AppStackNavigationProps, AppStackRouteProps } from '@app/navigation/AppStack';
import { parseNutrient } from '@app/lib/parseNutrient';
import { NutritionLabelService, type NutritionLabel } from '@app/services/NutritionLabelService';
import type { SavedFood } from '@app/types/SavedFood';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { FormGroup } from '@ui/components/FormGroup';
import { Input } from '@ui/components/Input';
import { theme } from '@ui/styles/theme';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { isAxiosError } from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { CameraIcon, CheckIcon, ImagesIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

type Draft = {
  name: string;
  quantity: string;
  proteins: string;
  carbohydrates: string;
  fats: string;
};

const nutrientValidationMessage = 'Use um valor de 0 a 10000, com até duas casas decimais.';

function formatValue(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

function scanErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return 'Não foi possível preparar ou ler a foto. Escolha outra imagem e tente novamente.';
  }
  if (error.response?.status === 400) {
    return 'Não encontrei uma tabela nutricional legível. Fotografe o rótulo de frente, com boa luz, e tente novamente.';
  }
  return error.response
    ? 'Não foi possível ler o rótulo agora. Tente novamente.'
    : 'Não foi possível conectar à API. Confira a conexão e tente novamente.';
}

async function prepareJpeg(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const manipulator = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  const longestSide = Math.max(asset.width, asset.height);
  if (longestSide > 1600) {
    if (asset.width >= asset.height) {
      manipulator.resize({ width: 1600 });
    } else {
      manipulator.resize({ height: 1600 });
    }
  }
  try {
    const rendered = await manipulator.renderAsync();
    try {
      return (await rendered.saveAsync({
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.85,
      })).uri;
    } finally {
      rendered.release();
    }
  } finally {
    manipulator.release();
  }
}

export function NutritionLabelScanner() {
  const { goBack, replace } = useNavigation<AppStackNavigationProps>();
  const { params } = useRoute<AppStackRouteProps<'NutritionLabelScanner'>>();
  const { top, bottom } = useSafeAreaInsets();
  const { saveFood, isSavingFood } = useSaveFood();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [label, setLabel] = useState<NutritionLabel | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [savedFood, setSavedFood] = useState<Omit<SavedFood, 'id'> | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const pickInProgress = useRef(false);

  async function choosePhoto(source: 'camera' | 'library') {
    if ((Platform.OS !== 'web' && pickInProgress.current) || isScanning || isSavingFood) {
      return;
    }
    if (Platform.OS !== 'web') {
      pickInProgress.current = true;
      setIsPicking(true);
    }
    try {
      if (source === 'camera' && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setErrorMessage('Autorize o acesso à câmera ou escolha uma foto da galeria.');
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset || asset.width < 1 || asset.height < 1) {
        throw new Error('Invalid image dimensions.');
      }
      setErrorMessage(null);
      setIsScanning(true);
      const normalizedUri = await prepareJpeg(asset);
      const scanned = await NutritionLabelService.scan(normalizedUri);
      setPhotoUri(normalizedUri);
      setLabel(scanned);
      setDraft({
        name: scanned.name ?? '',
        quantity: scanned.quantity ?? '',
        proteins: formatValue(scanned.proteins),
        carbohydrates: formatValue(scanned.carbohydrates),
        fats: formatValue(scanned.fats),
      });
      setAttemptedSave(false);
    } catch (error) {
      setErrorMessage(scanErrorMessage(error));
    } finally {
      setIsScanning(false);
      if (Platform.OS !== 'web') {
        setIsPicking(false);
        pickInProgress.current = false;
      }
    }
  }

  function updateDraft(field: keyof Draft, value: string) {
    setErrorMessage(null);
    setDraft(current => current ? { ...current, [field]: value } : null);
  }

  async function save() {
    if (!draft || isSavingFood) {
      return;
    }
    setAttemptedSave(true);
    const name = draft.name.trim();
    const quantity = draft.quantity.trim();
    const proteins = parseNutrient(draft.proteins);
    const carbohydrates = parseNutrient(draft.carbohydrates);
    const fats = parseNutrient(draft.fats);
    if (!name || name.length > 120 || !quantity || quantity.length > 80
      || proteins === null || carbohydrates === null || fats === null) {
      setErrorMessage('Revise os campos destacados antes de salvar.');
      return;
    }
    try {
      const food = { name, quantity, proteins, carbohydrates, fats };
      await saveFood(food);
      setSavedFood(food);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Não foi possível salvar o alimento. Tente novamente.');
    }
  }

  function scanAnother() {
    setSavedFood(null);
    setPhotoUri(null);
    setLabel(null);
    setDraft(null);
    setErrorMessage(null);
    setAttemptedSave(false);
  }

  const proteins = draft ? parseNutrient(draft.proteins) : null;
  const carbohydrates = draft ? parseNutrient(draft.carbohydrates) : null;
  const fats = draft ? parseNutrient(draft.fats) : null;
  const calculatedCalories = proteins !== null && carbohydrates !== null && fats !== null
    ? (proteins + carbohydrates) * 4 + fats * 9
    : null;
  const labelCalories = label?.calories;
  const hasCalorieMismatch = labelCalories !== null && labelCalories !== undefined && calculatedCalories !== null
    && Math.abs(calculatedCalories - labelCalories) > Math.max(20, labelCalories * 0.2);
  const missingFields = draft
    ? [draft.name, draft.quantity, draft.proteins, draft.carbohydrates, draft.fats]
      .filter(value => !value.trim()).length
    : 0;
  const mealParams = params?.mealDate && params.mealDate <= formatDateToAPI(new Date())
    ? params : null;

  if (savedFood) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
        <AppHeader title="Alimento salvo" />
        <View style={styles.successContent}>
          <View style={styles.successIcon}><CheckIcon size={32} color={theme.colors.lime[900]} /></View>
          <AppText size="2xl" weight="semiBold" align="center">Pronto para usar</AppText>
          <AppText color={theme.colors.gray[700]} align="center">
            {savedFood.name} · {savedFood.quantity} foi salvo nos seus alimentos.
          </AppText>
          <View style={styles.successActions}>
            {mealParams && (
              <Button onPress={() => replace('EditMeal', {
                mode: 'create',
                date: mealParams.mealDate,
                timezoneOffsetMinutes: mealParams.timezoneOffsetMinutes,
                initialFood: savedFood,
              })}>Adicionar a uma refeição</Button>
            )}
            <Button variant={mealParams ? 'secondary' : 'primary'} onPress={goBack}>Concluir</Button>
            <Button variant="ghost" onPress={scanAnother}>Escanear outro rótulo</Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <AppHeader title="Escanear rótulo" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <AppText size="2xl" weight="semiBold">{draft ? 'Revise o rótulo' : 'Do rótulo para o diário'}</AppText>
            <AppText color={theme.colors.gray[700]}>
              {draft
                ? 'Confira a porção e os nutrientes antes de salvar.'
                : 'Fotografe a tabela nutricional para cadastrar um alimento reutilizável.'}
            </AppText>
          </View>

          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              style={draft ? styles.reviewPhoto : styles.photo}
              resizeMode="contain"
              accessibilityLabel="Foto do rótulo nutricional"
            />
          )}

          <View style={draft ? styles.compactActions : styles.actions}>
            <View style={draft ? styles.compactAction : undefined}>
              <Button variant={draft ? 'ghost' : 'primary'} style={draft ? styles.compactButton : undefined} leftIcon={CameraIcon} disabled={isPicking || isScanning || isSavingFood} onPress={() => choosePhoto('camera')}>
                {draft ? 'Câmera' : 'Fotografar rótulo'}
              </Button>
            </View>
            <View style={draft ? styles.compactAction : undefined}>
              <Button variant={draft ? 'ghost' : 'secondary'} style={draft ? styles.compactButton : undefined} leftIcon={ImagesIcon} disabled={isPicking || isScanning || isSavingFood} onPress={() => choosePhoto('library')}>
                {draft ? 'Galeria' : 'Escolher da galeria'}
              </Button>
            </View>
          </View>

          {isScanning && (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={theme.colors.lime[700]} />
              <AppText weight="medium">Lendo tabela nutricional...</AppText>
            </View>
          )}

          {errorMessage && !draft && (
            <View style={styles.errorCard} accessibilityRole="alert">
              <AppText color={theme.colors.support.red} weight="medium">{errorMessage}</AppText>
            </View>
          )}

          {!draft && !isScanning && (
            <View style={styles.tipCard}>
              <AppText weight="semiBold">Para uma leitura melhor</AppText>
              <AppText color={theme.colors.gray[700]}>
                Inclua a porção e as colunas de calorias, proteínas, carboidratos e gorduras na foto. O nome do produto pode ser preenchido depois.
              </AppText>
            </View>
          )}

          {draft && label && (
            <View style={styles.review}>
              <View style={styles.reviewHeader}>
                <AppText size="lg" weight="semiBold">Dados do produto</AppText>
                <AppText size="sm" color={theme.colors.gray[700]}>
                  {label.basis ?? 'Coluna não identificada'}
                  {missingFields > 0 ? ` · ${missingFields} ${missingFields === 1 ? 'campo vazio' : 'campos vazios'}` : ''}
                </AppText>
              </View>
              <FormGroup label="Nome do produto" error={attemptedSave && !draft.name.trim() ? 'Informe o nome do produto.' : undefined}>
                <Input value={draft.name} onChangeText={value => updateDraft('name', value)} maxLength={120} placeholder="Ex.: Iogurte natural" />
              </FormGroup>
              <FormGroup label="Quantidade da coluna lida" error={attemptedSave && !draft.quantity.trim() ? 'Informe a quantidade indicada na coluna.' : undefined}>
                <Input value={draft.quantity} onChangeText={value => updateDraft('quantity', value)} maxLength={80} placeholder="Ex.: 170 g" />
              </FormGroup>
              <AppText size="sm" color={theme.colors.gray[700]}>
                Os nutrientes devem corresponder à mesma quantidade. Preencha os campos que a foto não permitiu ler.
              </AppText>
              <FormGroup label="Proteínas" error={attemptedSave && proteins === null ? nutrientValidationMessage : undefined}>
                <Input value={draft.proteins} onChangeText={value => updateDraft('proteins', value)} keyboardType="decimal-pad" suffix="g" placeholder="0" />
              </FormGroup>
              <FormGroup label="Carboidratos" error={attemptedSave && carbohydrates === null ? nutrientValidationMessage : undefined}>
                <Input value={draft.carbohydrates} onChangeText={value => updateDraft('carbohydrates', value)} keyboardType="decimal-pad" suffix="g" placeholder="0" />
              </FormGroup>
              <FormGroup label="Gorduras" error={attemptedSave && fats === null ? nutrientValidationMessage : undefined}>
                <Input value={draft.fats} onChangeText={value => updateDraft('fats', value)} keyboardType="decimal-pad" suffix="g" placeholder="0" />
              </FormGroup>
              <View style={styles.calorieCard}>
                <View style={styles.calorieRow}>
                  <AppText color={theme.colors.gray[700]}>No rótulo</AppText>
                  <AppText weight="semiBold">{label.calories === null ? 'Não lidas' : `${label.calories} kcal`}</AppText>
                </View>
                <View style={styles.calorieRow}>
                  <AppText color={theme.colors.gray[700]}>No diário</AppText>
                  <AppText weight="semiBold">{calculatedCalories === null ? '—' : `${Math.round(calculatedCalories)} kcal`}</AppText>
                </View>
                <AppText size="xs" color={theme.colors.gray[700]}>
                  O diário calcula as calorias com base nos nutrientes informados.
                </AppText>
                {hasCalorieMismatch && (
                  <AppText size="sm" color={theme.colors.support.red}>
                    Há uma diferença grande. Confira se todos os valores são da mesma coluna.
                  </AppText>
                )}
              </View>
            </View>
          )}
        </ScrollView>
        {draft && (
          <View style={[styles.footer, { paddingBottom: Math.max(bottom, 16) }]}>
            {errorMessage && (
              <View style={styles.errorCard} accessibilityRole="alert">
                <AppText color={theme.colors.support.red} weight="medium">{errorMessage}</AppText>
              </View>
            )}
            <Button onPress={save} isLoading={isSavingFood} disabled={isScanning}>Salvar alimento</Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
