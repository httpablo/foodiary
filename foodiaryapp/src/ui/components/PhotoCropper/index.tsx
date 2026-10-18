import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Photo = { uri: string; width: number; height: number };
type Crop = { originX: number; originY: number; width: number; height: number };
const initialZoom = 1.25;
const panStep = 24;

interface IPhotoCropperProps {
  photo: Photo | null;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: (crop: Crop) => void;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function PhotoCropper({ photo, isLoading, onCancel, onConfirm }: IPhotoCropperProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const viewportSize = Math.max(180, Math.min(screenWidth - 40, screenHeight - 360, 440));
  const [zoom, setZoom] = useState(initialZoom);
  const zoomRef = useRef(initialZoom);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  const dragStartRef = useRef(offset);

  useEffect(() => {
    const initialOffset = { x: 0, y: 0 };
    offsetRef.current = initialOffset;
    setOffset(initialOffset);
    zoomRef.current = initialZoom;
    setZoom(initialZoom);
  }, [photo?.uri]);

  const photoWidth = photo?.width ?? 1;
  const photoHeight = photo?.height ?? 1;
  const scale = Math.max(viewportSize / photoWidth, viewportSize / photoHeight) * zoom;
  const displayWidth = photoWidth * scale;
  const displayHeight = photoHeight * scale;
  const maxX = (displayWidth - viewportSize) / 2;
  const maxY = (displayHeight - viewportSize) / 2;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { dragStartRef.current = offsetRef.current; },
    onPanResponderMove: (_, gesture) => {
      const next = {
        x: clamp(dragStartRef.current.x + gesture.dx, -maxX, maxX),
        y: clamp(dragStartRef.current.y + gesture.dy, -maxY, maxY),
      };
      offsetRef.current = next;
      setOffset(next);
    },
  }), [maxX, maxY]);

  function changeZoom(step: number) {
    const next = clamp(zoomRef.current + step, 1, 3);
    if (next === zoomRef.current) {
      return;
    }
    const nextScale = Math.max(viewportSize / photoWidth, viewportSize / photoHeight) * next;
    const nextMaxX = (photoWidth * nextScale - viewportSize) / 2;
    const nextMaxY = (photoHeight * nextScale - viewportSize) / 2;
    const nextOffset = {
      x: clamp(offsetRef.current.x, -nextMaxX, nextMaxX),
      y: clamp(offsetRef.current.y, -nextMaxY, nextMaxY),
    };
    offsetRef.current = nextOffset;
    zoomRef.current = next;
    setOffset(nextOffset);
    setZoom(next);
  }

  function moveOffset(dx: number, dy: number) {
    const next = {
      x: clamp(offsetRef.current.x + dx, -maxX, maxX),
      y: clamp(offsetRef.current.y + dy, -maxY, maxY),
    };
    offsetRef.current = next;
    setOffset(next);
  }

  function resetOffset() {
    const next = { x: 0, y: 0 };
    offsetRef.current = next;
    setOffset(next);
  }

  function confirm() {
    const size = Math.min(photoWidth, photoHeight, Math.max(1, Math.round(viewportSize / scale)));
    onConfirm({
      originX: clamp(Math.round((photoWidth - size) / 2 - offset.x / scale), 0, photoWidth - size),
      originY: clamp(Math.round((photoHeight - size) / 2 - offset.y / scale), 0, photoHeight - size),
      width: size,
      height: size,
    });
  }

  const canMoveUp = !isLoading && offset.y > -maxY;
  const canMoveDown = !isLoading && offset.y < maxY;
  const canMoveLeft = !isLoading && offset.x > -maxX;
  const canMoveRight = !isLoading && offset.x < maxX;
  const canCenter = !isLoading && (offset.x !== 0 || offset.y !== 0);

  return (
    <Modal
      visible={!!photo}
      animationType="slide"
      onRequestClose={() => {
        if (!isLoading) {
          onCancel();
        }
      }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <AppText size="2xl" weight="semiBold" align="center">Ajustar foto</AppText>
          <AppText align="center" color={theme.colors.gray[700]}>
            Arraste a imagem ou use os botões abaixo para escolher o recorte
          </AppText>

          <View style={[styles.viewport, { width: viewportSize, height: viewportSize }]} {...panResponder.panHandlers}>
            {photo && (
              <Image
                source={{ uri: photo.uri }}
                resizeMode="stretch"
                style={{
                  position: 'absolute',
                  width: displayWidth,
                  height: displayHeight,
                  left: (viewportSize - displayWidth) / 2 + offset.x,
                  top: (viewportSize - displayHeight) / 2 + offset.y,
                }}
              />
            )}
          </View>

          <View style={styles.zoomControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Diminuir zoom"
              onPress={() => changeZoom(-0.25)}
              disabled={zoom <= 1 || isLoading}
              style={[styles.zoomButton, (zoom <= 1 || isLoading) && styles.disabledZoomButton]}
            >
              <AppText size="2xl">−</AppText>
            </Pressable>
            <AppText>{Math.round(zoom * 100)}%</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aumentar zoom"
              onPress={() => changeZoom(0.25)}
              disabled={zoom >= 3 || isLoading}
              style={[styles.zoomButton, (zoom >= 3 || isLoading) && styles.disabledZoomButton]}
            >
              <AppText size="2xl">+</AppText>
            </Pressable>
          </View>

          <View style={styles.positionControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mover foto para esquerda"
              onPress={() => moveOffset(panStep, 0)}
              disabled={!canMoveRight}
              style={[styles.positionButton, !canMoveRight && styles.disabledZoomButton]}
            >
              <AppText size="sm" weight="medium">← Esquerda</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mover foto para cima"
              onPress={() => moveOffset(0, panStep)}
              disabled={!canMoveDown}
              style={[styles.positionButton, !canMoveDown && styles.disabledZoomButton]}
            >
              <AppText size="sm" weight="medium">↑ Cima</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Centralizar foto"
              onPress={resetOffset}
              disabled={!canCenter}
              style={[styles.positionButton, !canCenter && styles.disabledZoomButton]}
            >
              <AppText size="sm" weight="medium">Centralizar</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mover foto para baixo"
              onPress={() => moveOffset(0, -panStep)}
              disabled={!canMoveUp}
              style={[styles.positionButton, !canMoveUp && styles.disabledZoomButton]}
            >
              <AppText size="sm" weight="medium">↓ Baixo</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mover foto para direita"
              onPress={() => moveOffset(-panStep, 0)}
              disabled={!canMoveLeft}
              style={[styles.positionButton, !canMoveLeft && styles.disabledZoomButton]}
            >
              <AppText size="sm" weight="medium">Direita →</AppText>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <View style={styles.action}>
              <Button variant="secondary" onPress={onCancel} disabled={isLoading}>Cancelar</Button>
            </View>
            <View style={styles.action}>
              <Button onPress={confirm} isLoading={isLoading}>Recortar</Button>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.white,
  },
  viewport: {
    overflow: 'hidden',
    backgroundColor: theme.colors.gray[400],
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  zoomButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gray[300],
  },
  positionControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  positionButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gray[200],
  },
  disabledZoomButton: {
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  action: {
    flex: 1,
  },
});
