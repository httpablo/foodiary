import { useSetWeightGoal } from '@app/hooks/mutations/useSetWeightGoal';
import { useWeightGoal } from '@app/hooks/queries/useWeightGoal';
import { useWeightGoalPreview } from '@app/hooks/queries/useWeightGoalPreview';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { getErrorMessage } from '@app/utils/getErrorMessage';
import { useNavigation } from '@react-navigation/native';
import { useConfirmDialog } from '@ui/components/ConfirmDialog';
import { parseDecimal } from '@ui/utils/parseDecimal';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SetupStep = 1 | 2 | 3;

const DEBOUNCE_MS = 400;
const MIN_TARGET = 30;
const MAX_TARGET = 700;

function toFriendlyPreviewError(error: unknown): string {
  const message = getErrorMessage(error, '').toLowerCase();

  if (message.includes('healthy range')) {
    return 'Esse peso está abaixo da faixa saudável para a sua altura. Escolha um valor maior.';
  }
  if (message.includes('at least 0.5')) {
    return 'Escolha um peso que difira do seu peso atual em pelo menos 0,5 kg.';
  }
  if (message.includes('30') || message.includes('700')) {
    return 'Informe um peso entre 30 e 700 kg.';
  }
  return 'Não foi possível calcular esse objetivo agora. Tente novamente.';
}

export function useWeightGoalSetupController() {
  const { top, bottom } = useSafeAreaInsets();
  const navigation = useNavigation<AppStackNavigationProps>();
  const { alert } = useConfirmDialog();
  const { weightGoalOverview, weightGoal, isLoading } = useWeightGoal();
  const { setWeightGoal, isSettingWeightGoal } = useSetWeightGoal();

  const [step, setStep] = useState<SetupStep>(1);
  const [targetInput, setTargetInput] = useState('');
  const [debouncedTarget, setDebouncedTarget] = useState<number | undefined>(undefined);
  const [selectedKey, setSelectedKey] = useState<string>('RECOMMENDED');
  const [applyToDailyGoals, setApplyToDailyGoals] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasPrefilled = useRef(false);
  const isFinishing = useRef(false);

  // Prefill with the active goal's target when editing.
  useEffect(() => {
    if (!hasPrefilled.current && weightGoal?.status === 'ACTIVE') {
      hasPrefilled.current = true;
      setTargetInput(String(weightGoal.targetWeight).replace('.', ','));
    }
  }, [weightGoal]);

  const parsedTarget = parseDecimal(targetInput);
  const isTargetValid = Number.isFinite(parsedTarget) && parsedTarget >= MIN_TARGET && parsedTarget <= MAX_TARGET;
  const target = isTargetValid ? Number(parsedTarget.toFixed(1)) : undefined;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedTarget(target), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [target]);

  const { preview, isLoading: isLoadingPreview, isFetching: isFetchingPreview, isError, error } = (
    useWeightGoalPreview(debouncedTarget)
  );

  const isSettled = target === debouncedTarget;
  const isCalculating = target !== undefined && (!isSettled || isLoadingPreview || isFetchingPreview);
  const previewError = isError && isSettled && target !== undefined ? toFriendlyPreviewError(error) : null;
  const inputError = targetInput.trim() !== '' && !isTargetValid
    ? 'Informe um peso entre 30 e 700 kg.'
    : null;

  const currentWeight = preview?.currentWeight ?? weightGoalOverview?.currentWeight;
  const validPreview = isSettled && !isError ? preview : undefined;
  const canContinueFromWeight = !!validPreview && !isCalculating;

  const selectedOption = validPreview?.options.find(option => option.key === selectedKey)
    ?? validPreview?.options.find(option => option.key === 'RECOMMENDED');

  // Reset pace to the recommended one whenever the target changes.
  useEffect(() => {
    setSelectedKey('RECOMMENDED');
  }, [debouncedTarget]);

  // Intercept back (header, gesture, hardware) to walk through the wizard steps.
  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (isFinishing.current || step === 1) {
      return;
    }
    event.preventDefault();
    setStep(previous => (previous - 1) as SetupStep);
  }), [navigation, step]);

  function goBackStep() {
    if (step === 1) {
      navigation.goBack();
      return;
    }
    setStep(previous => (previous - 1) as SetupStep);
  }

  function goNextStep() {
    setStep(previous => Math.min(3, previous + 1) as SetupStep);
  }

  async function handleConfirm() {
    if (!selectedOption || target === undefined) {
      return;
    }
    setSubmitError(null);
    try {
      await setWeightGoal({
        targetWeight: target,
        paceKgPerWeek: selectedOption.paceKgPerWeek,
        applyToDailyGoals,
      });
      isFinishing.current = true;
      navigation.replace('MyWeight');
      void alert({
        title: 'Meta definida!',
        message: applyToDailyGoals
          ? 'Sua meta de peso e suas metas diárias foram atualizadas.'
          : 'Sua meta de peso foi definida. Suas metas diárias continuam as mesmas.',
      });
    } catch (submitFailure) {
      setSubmitError(getErrorMessage(submitFailure, 'Não foi possível salvar sua meta agora.'));
    }
  }

  return {
    top,
    bottom,
    isLoading,
    isEditing: weightGoal?.status === 'ACTIVE',
    healthyRange: weightGoalOverview?.healthyRange,
    currentWeight,
    step,
    targetInput,
    setTargetInput,
    target,
    inputError,
    previewError,
    isCalculating,
    preview: validPreview,
    canContinueFromWeight,
    selectedOption,
    setSelectedKey,
    applyToDailyGoals,
    setApplyToDailyGoals,
    submitError,
    goBackStep,
    goNextStep,
    handleConfirm,
    isSubmitting: isSettingWeightGoal,
  };
}
