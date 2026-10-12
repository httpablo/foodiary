import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { CreateMealOptions } from '@ui/components/CreateMealOptions';
import { theme } from '@ui/styles/theme';
import { PlusIcon } from 'lucide-react-native';
import { useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

export function Fab({ date }: { date: Date }) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { bottom } = useSafeAreaInsets();

  function handleOpenBottomSheet() {
    bottomSheetModalRef.current?.present();
  }

  return (
    <>
      <View style={[styles.container, { bottom: bottom }]}>
        <Button size="icon" onPress={handleOpenBottomSheet}>
          <PlusIcon size={20} color={theme.colors.black[700]} />
        </Button>
      </View>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        style={styles.bottomSheet}
      >
        <BottomSheetView
          style={[
            styles.content,
            { paddingBottom: bottom },
          ]}
        >
          <AppText style={styles.title} size="lg" weight="semiBold">
            Cadastre sua refeição
          </AppText>

          <CreateMealOptions
            date={date}
            onCreate={() => bottomSheetModalRef.current?.dismiss()}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
