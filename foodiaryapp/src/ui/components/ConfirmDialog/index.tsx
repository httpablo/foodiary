import { createContext, use, useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { theme } from '@ui/styles/theme';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { styles } from './styles';

export interface IConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void | Promise<void>;
}

export interface IAlertDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

interface IConfirmDialogEntry extends IConfirmDialogOptions {
  id: number;
  type: 'confirm' | 'alert';
  resolve: (confirmed: boolean) => void;
}

export interface IConfirmDialogContextValue {
  confirm: (options: IConfirmDialogOptions) => Promise<boolean>;
  alert: (options: IAlertDialogOptions) => Promise<void>;
}

const ConfirmDialogContext = createContext<IConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<IConfirmDialogEntry[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const nextIdRef = useRef(1);

  const currentDialog = queue[0] ?? null;

  const confirm = useCallback((options: IConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      const id = nextIdRef.current++;
      setQueue(prev => [
        ...prev,
        {
          ...options,
          id,
          type: 'confirm',
          resolve,
        },
      ]);
    });
  }, []);

  const alert = useCallback((options: IAlertDialogOptions) => {
    return new Promise<void>((resolve) => {
      const id = nextIdRef.current++;
      setQueue(prev => [
        ...prev,
        {
          ...options,
          id,
          type: 'alert',
          resolve: () => resolve(),
        },
      ]);
    });
  }, []);

  const closeCurrent = useCallback((result: boolean) => {
    setQueue((prev) => {
      const [current, ...rest] = prev;
      if (current) {
        current.resolve(result);
      }
      return rest;
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (isConfirming) {
      return;
    }
    closeCurrent(false);
  }, [closeCurrent, isConfirming]);

  const handleConfirm = useCallback(async () => {
    if (!currentDialog || isConfirming) {
      return;
    }

    if (!currentDialog.onConfirm) {
      closeCurrent(true);
      return;
    }

    setIsConfirming(true);
    try {
      await currentDialog.onConfirm();
    } finally {
      setIsConfirming(false);
      closeCurrent(true);
    }
  }, [closeCurrent, currentDialog, isConfirming]);

  const contextValue = useMemo<IConfirmDialogContextValue>(() => ({
    confirm,
    alert,
  }), [confirm, alert]);

  const confirmLabel = currentDialog?.confirmLabel
    ?? (currentDialog?.type === 'alert' ? 'Entendi' : 'Confirmar');
  const cancelLabel = currentDialog?.cancelLabel ?? 'Cancelar';

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}

      <Modal
        visible={!!currentDialog}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleCancel}
          accessibilityLabel="Fechar diálogo"
        >
          {currentDialog && (
            <Pressable
              style={styles.dialog}
              onPress={(event) => event.stopPropagation()}
              role="dialog"
              accessibilityRole="alert"
              accessibilityLabel={currentDialog.title}
              accessibilityViewIsModal
              aria-modal
            >
              <AppText size="lg" weight="semiBold" style={styles.title}>
                {currentDialog.title}
              </AppText>

              <AppText
                color={theme.colors.gray[700]}
                style={styles.message}
                accessibilityLiveRegion="polite"
              >
                {currentDialog.message}
              </AppText>

              <View style={styles.actions}>
                {currentDialog.type === 'confirm' && (
                  <View style={styles.actionWrapper}>
                    <Button
                      variant="secondary"
                      style={styles.actionButton}
                      onPress={handleCancel}
                      disabled={isConfirming}
                      accessibilityLabel={cancelLabel}
                    >
                      {cancelLabel}
                    </Button>
                  </View>
                )}

                <View style={styles.actionWrapper}>
                  <Button
                    variant={currentDialog.destructive ? 'secondary' : 'primary'}
                    style={[
                      styles.actionButton,
                      currentDialog.destructive && styles.destructiveButton,
                    ]}
                    onPress={handleConfirm}
                    isLoading={isConfirming}
                    accessibilityLabel={confirmLabel}
                  >
                    {currentDialog.destructive ? (
                      <AppText weight="medium" color={theme.colors.white}>
                        {confirmLabel}
                      </AppText>
                    ) : (
                      confirmLabel
                    )}
                  </Button>
                </View>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): IConfirmDialogContextValue {
  const context = use(ConfirmDialogContext);

  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }

  return context;
}
