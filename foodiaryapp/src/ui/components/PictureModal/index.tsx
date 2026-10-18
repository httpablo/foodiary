import { Image, Modal, StatusBar, View } from 'react-native';

import { theme } from '@ui/styles/theme';
import { CameraView } from 'expo-camera';
import { CameraIcon, CheckIcon, Trash2Icon, UnlockIcon, XIcon } from 'lucide-react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { CreateMealLoader } from '../CreateMealLoader';
import { styles } from './styles';
import { usePictureModalController } from './usePictureModalController';

interface IPictureModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate?: () => void;
  onManualCreate?: () => void;
}

export function PictureModal({ visible, onClose, onCreate, onManualCreate }: IPictureModalProps) {
  const {
    isLoading,
    permission,
    cameraRef,
    photoUri,
    cameraError,
    handleRequestPermission,
    handleCameraMountError,
    handleTakePicture,
    handleTryAgain,
    handleManualEntry,
    handleConfirm,
  } = usePictureModalController({ visible, onClose, onCreate, onManualCreate });

  const isPermissionBlocked = permission?.granted === false && permission.canAskAgain === false;
  const isPermissionDenied = permission?.granted === false && permission.status === 'denied';
  const showFallback = !permission || !permission.granted || !!cameraError;

  const fallbackMessage = cameraError
    ?? (isPermissionBlocked
      ? 'O acesso à câmera está bloqueado. Habilite a permissão da câmera nas configurações do navegador ou do sistema, ou cadastre sua refeição manualmente.'
      : isPermissionDenied
      ? 'Permissão de acesso à câmera negada. Conceda acesso à câmera para tirar uma foto ou cadastre sua refeição manualmente.'
      : 'Para registrar sua refeição com uma foto, precisamos de acesso à câmera do seu dispositivo.');

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      transparent
      statusBarTranslucent
      animationType="slide"
    >
      <StatusBar animated translucent barStyle="light-content" />
      {isLoading && <CreateMealLoader type="picture" />}

      {!isLoading && (
        <View style={styles.container}>
          <SafeAreaProvider>
            <SafeAreaView style={styles.content}>
              <View style={styles.header}>
                <Button
                  size="icon"
                  variant="neutral"
                  rippleStyle="light"
                  accessibilityLabel="Fechar câmera"
                  onPress={onClose}
                >
                  <XIcon size={20} color={theme.colors.gray[500]} />
                </Button>
              </View>

              {showFallback && (
                <View style={styles.body}>
                  <View
                    style={styles.permissionContainer}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    <CameraIcon
                      size={32}
                      color={theme.colors.gray[500]}
                    />

                    <AppText
                      color={theme.colors.gray[500]}
                      align="center"
                      style={styles.permissionLabel}
                    >
                      {fallbackMessage}
                    </AppText>
                  </View>

                  <View style={styles.permissionActions}>
                    <Button
                      onPress={handleRequestPermission}
                      leftIcon={!isPermissionBlocked && !isPermissionDenied && !cameraError ? UnlockIcon : undefined}
                    >
                      {isPermissionBlocked || isPermissionDenied || cameraError
                        ? 'Tentar novamente'
                        : 'Conceder acesso'}
                    </Button>

                    <Button
                      variant="neutral"
                      rippleStyle="light"
                      onPress={handleManualEntry}
                    >
                      <AppText color={theme.colors.white} weight="medium">
                        Cadastrar manualmente
                      </AppText>
                    </Button>
                  </View>
                </View>
              )}

              {!showFallback && (
                <>
                  <View style={styles.body}>
                    {!photoUri && (
                      <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing="back"
                        onMountError={handleCameraMountError}
                      />
                    )}

                    {photoUri && (
                      <Image
                        source={{ uri: photoUri }}
                        style={styles.picture}
                      />
                    )}
                  </View>

                  <View style={styles.footer}>
                    <View style={styles.actionsContainer}>
                      {!photoUri && (
                        <>
                          <Button
                            size="icon"
                            variant="neutral"
                            rippleStyle="light"
                            accessibilityLabel="Tirar foto"
                            onPress={handleTakePicture}
                          >
                            <CameraIcon size={20} color={theme.colors.lime[600]} />
                          </Button>

                          <AppText
                            color={theme.colors.gray[500]}
                            style={styles.actionLabel}
                            align="center"
                          >
                            Tirar foto
                          </AppText>
                        </>
                      )}

                      {photoUri && (
                        <View style={styles.actionsGroup}>
                          <Button
                            size="icon"
                            variant="neutral"
                            rippleStyle="light"
                            accessibilityLabel="Descartar foto"
                            onPress={handleTryAgain}
                          >
                            <Trash2Icon
                              size={20}
                              color={theme.colors.gray[500]}
                            />
                          </Button>
                          <Button
                            size="icon"
                            accessibilityLabel="Confirmar foto"
                            onPress={handleConfirm}
                          >
                            <CheckIcon
                              size={20}
                              color={theme.colors.black[700]}
                            />
                          </Button>
                        </View>
                      )}
                    </View>
                  </View>
                </>
              )}
            </SafeAreaView>
          </SafeAreaProvider>
        </View>
      )}
    </Modal>
  );
}
