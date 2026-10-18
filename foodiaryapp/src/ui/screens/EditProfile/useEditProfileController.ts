import { useUpdateProfile } from '@app/hooks/mutations/useUpdateProfile';
import { useUpdateProfilePhoto } from '@app/hooks/mutations/useUpdateProfilePhoto';
import { useAccount } from '@app/hooks/queries/useAccount';
import { Gender } from '@app/types/Gender';
import { useConfirmDialog } from '@ui/components/ConfirmDialog';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { editProfileSchema, EditProfileSchema } from './schema';

export interface IProfileFeedback {
  type: 'success' | 'error';
  message: string;
}

export function useEditProfileController() {
  const { top, bottom } = useSafeAreaInsets();
  const { account } = useAccount();
  const { updateProfile, isLoading } = useUpdateProfile();
  const { updateProfilePhoto, isPhotoUploading } = useUpdateProfilePhoto();
  const { alert } = useConfirmDialog();
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [feedback, setFeedback] = useState<IProfileFeedback | null>(null);

  const form = useForm<EditProfileSchema>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: account?.profile.name ?? '',
      birthDate: account?.profile.birthDate ?? new Date(),
      height: String(account?.profile.height ?? ''),
      weight: String(account?.profile.weight ?? ''),
      gender: account?.profile.gender ?? Gender.MALE,
    },
  });
  const hasLoadedDefaults = useRef(!!account);

  useEffect(() => {
    if (!hasLoadedDefaults.current && account) {
      form.reset({
        name: account.profile.name,
        birthDate: account.profile.birthDate,
        height: String(account.profile.height),
        weight: String(account.profile.weight),
        gender: account.profile.gender,
      });
      hasLoadedDefaults.current = true;
    }
  }, [account, form.reset]);

  const handleSubmit = form.handleSubmit(async (data) => {
    setFeedback(null);
    try {
      await updateProfile({
        name: data.name,
        birthDate: formatDateToAPI(data.birthDate),
        height: Number(data.height),
        weight: Number(data.weight),
        gender: data.gender,
      });

      const message = 'Perfil atualizado com sucesso.';
      setFeedback({ type: 'success', message });
      void alert({ title: 'Sucesso!', message });
    } catch {
      const message = 'Não foi possível atualizar o perfil.';
      setFeedback({ type: 'error', message });
      void alert({ title: 'Erro', message });
    }
  });

  async function handlePickPhoto() {
    if (isPhotoUploading) {
      return;
    }

    setFeedback(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled) {
        return;
      }
      const asset = result.assets[0];
      if (!asset || asset.width < 1 || asset.height < 1) {
        throw new Error('Invalid photo dimensions');
      }
      setSelectedPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch {
      const message = 'Escolha outra imagem e tente novamente.';
      setFeedback({ type: 'error', message });
      void alert({ title: 'Erro ao escolher a foto', message });
    }
  }

  async function handleConfirmPhoto(crop: { originX: number; originY: number; width: number; height: number }) {
    if (!selectedPhoto || isProcessingPhoto || isPhotoUploading) {
      return;
    }

    setFeedback(null);
    setIsProcessingPhoto(true);
    let isUploading = false;
    try {
      const image = ImageManipulator.ImageManipulator.manipulate(selectedPhoto.uri);
      image.crop(crop).resize({ width: 512, height: 512 });
      const rendered = await image.renderAsync();
      const photo = await rendered.saveAsync({
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.8,
      });
      image.release();
      rendered.release();
      isUploading = true;
      await updateProfilePhoto(photo.uri);
      setSelectedPhoto(null);
      setFeedback({ type: 'success', message: 'Foto do perfil atualizada com sucesso.' });
    } catch (error) {
      const message = !isUploading
        ? 'Não foi possível recortar a foto. Escolha outra imagem e tente novamente.'
        : isAxiosError(error)
          ? error.response
            ? `A API recusou a foto (HTTP ${error.response.status}). Tente novamente.`
            : 'Não foi possível conectar à API. Verifique a conexão e tente novamente.'
          : 'Não foi possível enviar a foto. Tente novamente.';
      setFeedback({ type: 'error', message });
      void alert({ title: 'Erro ao atualizar a foto', message });
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  return {
    top,
    bottom,
    form,
    feedback,
    handleSubmit,
    handlePickPhoto,
    handleConfirmPhoto,
    cancelPhoto: () => setSelectedPhoto(null),
    selectedPhoto,
    isPhotoUploading: isPhotoUploading || isProcessingPhoto,
    isSubmitting: form.formState.isSubmitting || isLoading || isPhotoUploading || isProcessingPhoto,
  };
}
