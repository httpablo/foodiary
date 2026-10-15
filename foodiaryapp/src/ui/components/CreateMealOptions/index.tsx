import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@ui/styles/theme';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { CameraIcon, LucideIcon, MicIcon, PencilIcon, ScanTextIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { AppText } from '../AppText';
import { AudioModal } from '../AudioModal';
import { PictureModal } from '../PictureModal';
import { styles } from './styles';

interface ICreateMealOptionsProps {
  date: Date;
  disabled?: boolean;
  onCreate?: () => void;
}

export function CreateMealOptions({ date, disabled = false, onCreate }: ICreateMealOptionsProps) {
  const { navigate } = useNavigation<AppStackNavigationProps>();
  const [
    currentVisibleModal,
    setCurrentVisibleModal,
  ] = useState<null | 'audio' | 'picture'>(null);

  function handleOpenModal(modal: 'audio' | 'picture') {
    setCurrentVisibleModal(modal);
  }

  function handleCloseModal() {
    setCurrentVisibleModal(null);
  }

  function handleManualMeal() {
    if (formatDateToAPI(date) > formatDateToAPI(new Date())) {
      Alert.alert('Escolha outra data', 'Não é possível cadastrar uma refeição em um dia futuro.');
      return;
    }
    onCreate?.();
    navigate('EditMeal', {
      mode: 'create',
      date: formatDateToAPI(date),
      timezoneOffsetMinutes: date.getTimezoneOffset(),
    });
  }

  return (
    <View style={styles.container}>
      <AudioModal
        visible={currentVisibleModal === 'audio'}
        onClose={handleCloseModal}
        onCreate={onCreate}
      />
      <PictureModal
        visible={currentVisibleModal === 'picture'}
        onClose={handleCloseModal}
        onCreate={onCreate}
      />

      <View style={styles.mediaOptions}>
        <OptionButton
          icon={MicIcon}
          label="Áudio"
          disabled={disabled}
          onPress={() => handleOpenModal('audio')}
        />
        <OptionButton
          icon={CameraIcon}
          label="Foto"
          disabled={disabled}
          onPress={() => handleOpenModal('picture')}
        />
      </View>
      <OptionButton
        icon={PencilIcon}
        label="Cadastrar manualmente"
        disabled={disabled}
        onPress={handleManualMeal}
        horizontal
      />
      <OptionButton
        icon={ScanTextIcon}
        label="Cadastrar alimento pelo rótulo"
        disabled={disabled}
        onPress={() => {
          onCreate?.();
          navigate('NutritionLabelScanner', {
            mealDate: formatDateToAPI(date),
            timezoneOffsetMinutes: date.getTimezoneOffset(),
          });
        }}
        horizontal
      />
    </View>
  );
}

interface IOptionButtonProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  horizontal?: boolean;
}

export function OptionButton({ icon: Icon, label, disabled, onPress, horizontal = false }: IOptionButtonProps) {
  return (
    <View style={[styles.buttonWrapper, horizontal ? styles.buttonWrapperHorizontal : styles.buttonWrapperMedia]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', foreground: true }}
        style={({ pressed }) => [
          styles.button,
          horizontal && styles.buttonHorizontal,
          (disabled || (pressed && Platform.OS === 'ios')) && { opacity: 0.5 },
        ]}
      >
        <View style={styles.icon}>
          <Icon color={theme.colors.black[700]} size={24} />
        </View>

        <AppText weight="semiBold" style={styles.buttonLabel}>
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}
