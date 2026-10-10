import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Photo = { uri: string; width: number; height: number };
type Crop = { originX: number; originY: number; width: number; height: number };
const initialZoom = 1.25;

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
  const viewportSize = Math.max(180, Math.min(screenWidth - 40, screenHeight - 330, 440));
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

  function confirm() {
    const size = Math.min(photoWidth, photoHeight, Math.max(1, Math.round(viewportSize / scale)));
    onConfirm({
      originX: clamp(Math.round((photoWidth - size) / 2 - offset.x / scale), 0, photoWidth - size),
      originY: clamp(Math.round((photoHeight - size) / 2 - offset.y / scale), 0, photoHeight - size),
      width: size,
      height: size,
    });
  }

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
      <SafeAreaView style={styles.container}>
        <AppText size="2xl" weight="semiBold" align="center">Ajustar foto</AppText>
        <AppText align="center" color={theme.colors.gray[700]}>
          Arraste a imagem para escolher o recorte
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

        <View style={styles.actions}>
          <View style={styles.action}>
            <Button variant="secondary" onPress={onCancel} disabled={isLoading}>Cancelar</Button>
          </View>
          <View style={styles.action}>
            <Button onPress={confirm} isLoading={isLoading}>Recortar</Button>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
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
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gray[300],
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
