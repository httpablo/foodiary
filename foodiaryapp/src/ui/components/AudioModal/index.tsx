import { Modal, StatusBar, View } from 'react-native';

import { theme } from '@ui/styles/theme';
import { MicOffIcon, XIcon } from 'lucide-react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { CreateMealLoader } from '../CreateMealLoader';
import { Actions } from './Actions';
import { styles } from './styles';
import { useAudioModalController } from './useAudioModalController';

interface IAudioModalProps {
  visible: boolean;
  date?: Date;
  onClose: () => void;
  onCreate?: () => void;
  onManualCreate?: () => void;
}

export function AudioModal({ visible, date, onClose, onCreate, onManualCreate }: IAudioModalProps) {
  const {
    state,
    isLoading,
    audioUri,
    errorMessage,
    handleClose,
    handleStartRecording,
    handleStopRecording,
    handleTryAgain,
    handleRetryPermission,
    handleManualEntry,
    handleConfirm,
  } = useAudioModalController({ visible, date, onClose, onCreate, onManualCreate });

  const isRecording = state === 'recording';

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      transparent
      statusBarTranslucent
      animationType="slide"
    >
      <StatusBar animated translucent barStyle="light-content" />
      {isLoading && <CreateMealLoader type="audio" />}

      {!isLoading && (
        <View style={styles.container}>
          <SafeAreaProvider>
            <SafeAreaView style={styles.content}>
              <View style={styles.header}>
                <Button
                  size="icon"
                  variant="neutral"
                  rippleStyle="light"
                  accessibilityLabel="Fechar modal de áudio"
                  onPress={handleClose}
                >
                  <XIcon size={20} color={theme.colors.gray[500]} />
                </Button>
              </View>

              {errorMessage ? (
                <View style={styles.body}>
                  <View
                    style={styles.errorContainer}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    <MicOffIcon size={32} color={theme.colors.gray[500]} />

                    <AppText
                      color={theme.colors.gray[500]}
                      style={styles.errorText}
                      align="center"
                    >
                      {errorMessage}
                    </AppText>

                    <View style={styles.errorActions}>
                      <Button onPress={handleRetryPermission}>
                        Tentar novamente
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
                </View>
              ) : (
                <>
                  <View style={styles.body}>
                    <View style={[styles.circle1, isRecording && styles.circle1Recording]}>
                      <View style={[styles.circle2, isRecording && styles.circle2Recording]}>
                        <View style={[styles.circle3, isRecording && styles.circle3Recording]} />
                      </View>
                    </View>

                    <AppText
                      color={theme.colors.gray[500]}
                      style={styles.instructionsLabel}
                      align="center"
                    >
                      Tente dizer algo como: 100g de Arroz, 2 Ovos e 100g de Salada
                    </AppText>
                  </View>

                  <View style={styles.footer}>
                    <View style={styles.actionsContainer}>
                      <Actions
                        state={state}
                        audioUri={audioUri}
                        onStartRecording={handleStartRecording}
                        onStopRecording={handleStopRecording}
                        onTryAgain={handleTryAgain}
                        onConfirm={handleConfirm}
                      />
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
