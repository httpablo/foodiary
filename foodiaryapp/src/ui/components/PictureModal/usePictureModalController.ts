import { useCreateMeal } from '@app/hooks/mutations/useCreateMeal';
import { useMeal } from '@app/hooks/queries/useMeal';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { MealStatus } from '@app/types/Meal';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { CameraMountError, CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useConfirmDialog } from '../ConfirmDialog';

interface IUsePictureModalControllerParams {
  visible: boolean;
  onClose: () => void;
  onCreate?: () => void;
  onManualCreate?: () => void;
}

export function usePictureModalController({
  visible,
  onClose,
  onCreate,
  onManualCreate,
}: IUsePictureModalControllerParams) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<null | string>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const { navigate } = useNavigation<AppStackNavigationProps>();
  const queryClient = useQueryClient();
  const { alert } = useConfirmDialog();

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

  useEffect(() => {
    if (!visible) {
      setPhotoUri(null);
      setCameraError(null);
    }
  }, [visible]);

  useEffect(() => {
    if (meal?.status === MealStatus.FAILED) {
      const message = 'Ocorreu um erro ao criar a sua refeição! Tente novamente.';
      setCameraError(message);
      void alert({
        title: 'Oops!',
        message,
      });
    }

    if (meal?.status === MealStatus.SUCCESS) {
      memoizedOnClose.current();
      memoizedOnCreate.current?.();
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['weeklySummary'] });
      navigate('MealDetails', { mealId: meal.id });
    }
  }, [meal?.status, meal?.id, navigate, queryClient, alert]);

  const handleRequestPermission = useCallback(async () => {
    setCameraError(null);
    try {
      const response = await requestPermission();
      if (!response.granted && response.canAskAgain === false) {
        setCameraError(
          'O acesso à câmera está bloqueado. Habilite a permissão da câmera nas configurações do navegador ou do sistema, ou cadastre sua refeição manualmente.',
        );
      }
    } catch {
      setCameraError(
        'Não foi possível acessar a câmera neste dispositivo ou navegador. Verifique as permissões do sistema ou cadastre sua refeição manualmente.',
      );
    }
  }, [requestPermission]);

  const handleCameraMountError = useCallback((event: CameraMountError) => {
    const details = event?.message ?? '';
    if (/NotAllowedError|Permission|denied/i.test(details)) {
      setCameraError(
        'O acesso à câmera foi bloqueado pelo navegador ou sistema. Habilite a permissão da câmera nas configurações e tente novamente, ou cadastre manualmente.',
      );
      return;
    }

    setCameraError(
      'Não foi possível iniciar a câmera neste dispositivo ou navegador. Verifique se há uma câmera disponível e tente novamente, ou cadastre manualmente.',
    );
  }, []);

  async function handleTakePicture() {
    if (!cameraRef.current) {
      return;
    }

    try {
      const picture = await cameraRef.current.takePictureAsync({
        imageType: 'jpg',
      });

      if (!picture?.uri) {
        setCameraError('Não foi possível capturar a foto. Tente novamente ou cadastre manualmente.');
        return;
      }

      setCameraError(null);
      setPhotoUri(picture.uri);
    } catch {
      setCameraError('Não foi possível capturar a foto. Tente novamente ou cadastre manualmente.');
    }
  }

  function handleTryAgain() {
    setCameraError(null);
    setPhotoUri(null);
  }

  function handleManualEntry() {
    setCameraError(null);
    setPhotoUri(null);

    if (memoizedOnManualCreate.current) {
      memoizedOnManualCreate.current();
      return;
    }

    memoizedOnClose.current();
    memoizedOnCreate.current?.();
    const now = new Date();
    navigate('EditMeal', {
      mode: 'create',
      date: formatDateToAPI(now),
      timezoneOffsetMinutes: now.getTimezoneOffset(),
    });
  }

  async function handleConfirm() {
    if (!photoUri) {
      return;
    }

    try {
      setCameraError(null);
      await createMeal(photoUri);
    } catch {
      const message = 'Ocorreu um erro ao criar a sua refeição! Tente novamente.';
      setCameraError(message);
      void alert({
        title: 'Oops!',
        message,
      });
    }
  }

  return {
    isLoading: isCreatingMeal || isLoadingMeal || isProcessingMeal,
    permission,
    cameraRef,
    photoUri,
    cameraError,
    handleRequestPermission,
    handleCameraMountError,
    handleTryAgain,
    handleManualEntry,
    handleConfirm,
    handleTakePicture,
  };
}
