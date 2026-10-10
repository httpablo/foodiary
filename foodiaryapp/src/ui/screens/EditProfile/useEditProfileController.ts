import { useUpdateProfile } from '@app/hooks/mutations/useUpdateProfile';
import { useUpdateProfilePhoto } from '@app/hooks/mutations/useUpdateProfilePhoto';
import { useAccount } from '@app/hooks/queries/useAccount';
import { Gender } from '@app/types/Gender';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { isAxiosError } from 'axios';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { editProfileSchema, EditProfileSchema } from './schema';

export function useEditProfileController() {
  const { top, bottom } = useSafeAreaInsets();
  const { account } = useAccount();
  const { updateProfile, isLoading } = useUpdateProfile();
  const { updateProfilePhoto, isPhotoUploading } = useUpdateProfilePhoto();
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

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
    try {
      await updateProfile({
        name: data.name,
        birthDate: formatDateToAPI(data.birthDate),
        height: Number(data.height),
        weight: Number(data.weight),
        gender: data.gender,
      });

      Alert.alert('Sucesso!', 'Perfil atualizado com sucesso');
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil');
    }
  });

  async function handlePickPhoto() {
    if (isPhotoUploading) {
      return;
    }

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
      Alert.alert('Erro ao escolher a foto', 'Escolha outra imagem e tente novamente.');
    }
  }

  async function handleConfirmPhoto(crop: { originX: number; originY: number; width: number; height: number }) {
    if (!selectedPhoto || isProcessingPhoto || isPhotoUploading) {
      return;
    }

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
    } catch (error) {
      const message = !isUploading
        ? 'Não foi possível recortar a foto. Escolha outra imagem e tente novamente.'
        : isAxiosError(error)
          ? error.response
            ? `A API recusou a foto (HTTP ${error.response.status}). Tente novamente.`
            : 'Não foi possível conectar à API. Verifique a conexão e tente novamente.'
          : 'Não foi possível enviar a foto. Tente novamente.';
      Alert.alert('Erro ao atualizar a foto', message);
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  return {
    top,
    bottom,
    form,
    handleSubmit,
    handlePickPhoto,
    handleConfirmPhoto,
    cancelPhoto: () => setSelectedPhoto(null),
    selectedPhoto,
    isPhotoUploading: isPhotoUploading || isProcessingPhoto,
    isSubmitting: form.formState.isSubmitting || isLoading || isPhotoUploading || isProcessingPhoto,
  };
}
