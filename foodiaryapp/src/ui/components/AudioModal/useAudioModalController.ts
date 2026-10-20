import { useCreateMeal } from '@app/hooks/mutations/useCreateMeal';
import { useMeal } from '@app/hooks/queries/useMeal';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { MealStatus } from '@app/types/Meal';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useConfirmDialog } from '../ConfirmDialog';

export type AudioModalState = 'idle' | 'recording' | 'recorded';

interface IUseAudioModalControllerParams {
  visible: boolean;
  date?: Date;
  onClose: () => void;
  onCreate?: () => void;
  onManualCreate?: () => void;
}

function getAudioErrorMessage(error: unknown): string {
  const details = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');

  if (/NotAllowedError|Permission|denied/i.test(details)) {
    return 'Não foi possível acessar o microfone. Verifique as permissões do navegador ou do dispositivo e tente novamente.';
  }

  if (/NotFoundError|Requested device not found|device/i.test(details)) {
    return 'Nenhum microfone foi encontrado neste dispositivo. Conecte um microfone e tente novamente, ou cadastre sua refeição manualmente.';
  }

  return 'A gravação de áudio não está disponível neste dispositivo ou navegador. Tente novamente ou cadastre sua refeição manualmente.';
}

export function useAudioModalController({
  visible,
  date,
  onClose,
  onCreate,
  onManualCreate,
}: IUseAudioModalControllerParams) {
  const [state, setState] = useState<AudioModalState>('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecordingRef = useRef(false);
  const stateRef = useRef<AudioModalState>('idle');

  const { navigate } = useNavigation<AppStackNavigationProps>();
  const queryClient = useQueryClient();
  const { alert } = useConfirmDialog();

  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const memoizedOnClose = useRef(onClose);
  useLayoutEffect(() => { memoizedOnClose.current = onClose; }, [onClose]);

  const memoizedOnCreate = useRef(onCreate);
  useLayoutEffect(() => { memoizedOnCreate.current = onCreate; }, [onCreate]);

  const memoizedOnManualCreate = useRef(onManualCreate);
  useLayoutEffect(() => { memoizedOnManualCreate.current = onManualCreate; }, [onManualCreate]);

  const {
    createMeal,
    isLoading: isCreatingMeal,
    createdMealId,
  } = useCreateMeal();
  const {
    meal,
    isLoading: isLoadingMeal,
    isProcessing: isProcessingMeal,
  } = useMeal(createdMealId);

  const stopAndResetRecording = useCallback(async () => {
    const shouldStop = isRecordingRef.current || stateRef.current === 'recording' || audioRecorder.isRecording;
    isRecordingRef.current = false;

    if (shouldStop) {
      try {
        await audioRecorder.stop();
      } catch {
        // Ignore stop errors during cleanup
      }
    }

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      // Ignore audio mode reset errors on unsupported environments
    }

    setState('idle');
    setAudioUri(null);
  }, [audioRecorder]);

  const requestMicrophoneAccess = useCallback(async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();

      if (!status.granted) {
        setErrorMessage(
          status.canAskAgain === false
            ? 'O acesso ao microfone está bloqueado. Habilite a permissão de microfone nas configurações do navegador ou do sistema, ou cadastre sua refeição manualmente.'
            : 'Permissão para acessar o microfone negada. Conceda acesso ao microfone para gravar sua refeição ou cadastre manualmente.',
        );
        return false;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(getAudioErrorMessage(error));
      return false;
    }
  }, []);

  useEffect(() => {
    if (meal?.status === MealStatus.FAILED) {
      const message = 'Ocorreu um erro ao criar a sua refeição! Tente novamente.';
      setErrorMessage(message);
      void alert({
        title: 'Oops!',
        message,
      });
    }

    if (meal?.status === MealStatus.SUCCESS) {
      void stopAndResetRecording();
      memoizedOnClose.current();
      memoizedOnCreate.current?.();
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['weeklySummary'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      navigate('MealDetails', { mealId: meal.id });
    }
  }, [meal?.status, meal?.id, navigate, queryClient, alert, stopAndResetRecording]);

  useEffect(() => {
    if (!visible) {
      void stopAndResetRecording();
      setErrorMessage(null);
      return;
    }

    void requestMicrophoneAccess();
  }, [visible, requestMicrophoneAccess, stopAndResetRecording]);

  useEffect(() => {
    return () => {
      void stopAndResetRecording();
    };
  }, [stopAndResetRecording]);

  const handleClose = useCallback(async () => {
    await stopAndResetRecording();
    setErrorMessage(null);
    memoizedOnClose.current();
  }, [stopAndResetRecording]);

  async function handleStartRecording() {
    const hasAccess = await requestMicrophoneAccess();
    if (!hasAccess) {
      return;
    }

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      isRecordingRef.current = true;
      setErrorMessage(null);
      setState('recording');
    } catch (error) {
      isRecordingRef.current = false;
      setState('idle');
      setErrorMessage(getAudioErrorMessage(error));
    }
  }

  const handleStopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    try {
      await audioRecorder.stop();
      if (!audioRecorder.uri) {
        setState('idle');
        setErrorMessage('Não foi possível obter o áudio gravado. Tente novamente ou cadastre manualmente.');
        return;
      }

      setAudioUri(audioRecorder.uri);
      setState('recorded');
    } catch (error) {
      setState('idle');
      setErrorMessage(getAudioErrorMessage(error));
    }
  }, [audioRecorder]);

  function handleTryAgain() {
    setErrorMessage(null);
    setAudioUri(null);
    setState('idle');
  }

  async function handleRetryPermission() {
    setErrorMessage(null);
    await requestMicrophoneAccess();
  }

  async function handleManualEntry() {
    await stopAndResetRecording();
    setErrorMessage(null);

    if (memoizedOnManualCreate.current) {
      memoizedOnManualCreate.current();
      return;
    }

    memoizedOnClose.current();
    memoizedOnCreate.current?.();
    const targetDate = date ?? new Date();
    navigate('EditMeal', {
      mode: 'create',
      date: formatDateToAPI(targetDate),
      timezoneOffsetMinutes: targetDate.getTimezoneOffset(),
    });
  }

  async function handleConfirm() {
    if (!audioUri) {
      return;
    }

    const targetDate = date ?? new Date();
    if (formatDateToAPI(targetDate) > formatDateToAPI(new Date())) {
      const message = 'Não é possível cadastrar uma refeição em um dia futuro.';
      setErrorMessage(message);
      void alert({
        title: 'Escolha outra data',
        message,
      });
      return;
    }

    try {
      setErrorMessage(null);
      await createMeal({ uri: audioUri, date: targetDate });
    } catch {
      const message = 'Ocorreu um erro ao criar a sua refeição! Tente novamente.';
      setErrorMessage(message);
      void alert({
        title: 'Oops!',
        message,
      });
    }
  }

  return {
    state,
    audioUri,
    errorMessage,
    isLoading: isCreatingMeal || isLoadingMeal || isProcessingMeal,
    handleClose,
    handleStartRecording,
    handleStopRecording,
    handleTryAgain,
    handleRetryPermission,
    handleManualEntry,
    handleConfirm,
  };
}
