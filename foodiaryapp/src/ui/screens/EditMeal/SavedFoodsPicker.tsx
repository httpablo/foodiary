import { useDeleteSavedFood } from '@app/hooks/mutations/useDeleteSavedFood';
import { useSavedFoods } from '@app/hooks/queries/useSavedFoods';
import { SavedFood } from '@app/types/SavedFood';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { Input } from '@ui/components/Input';
import { theme } from '@ui/styles/theme';
import { Trash2Icon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { styles } from './styles';

export function SavedFoodsPicker({ onSelect, disabled }: { onSelect: (food: SavedFood) => void; disabled: boolean }) {
  const [search, setSearch] = useState('');
  const { savedFoods, isLoading, isError, refetch } = useSavedFoods();
  const { deleteSavedFood, isDeletingFood } = useDeleteSavedFood();
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const matches = savedFoods.filter(food => (
    `${food.name} ${food.quantity}`.toLocaleLowerCase('pt-BR').includes(query)
  ));

  function confirmDelete(food: SavedFood) {
    Alert.alert('Excluir alimento salvo?', `${food.name} será removido da sua lista.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await deleteSavedFood(food.id);
        } catch {
          Alert.alert('Erro', 'Não foi possível excluir o alimento salvo.');
        }
      } },
    ]);
  }

  return (
    <View style={styles.savedFoodsPanel}>
      <Input value={search} onChangeText={setSearch} placeholder="Buscar alimento salvo" />
      {isLoading ? <ActivityIndicator color={theme.colors.lime[700]} /> : isError ? (
        <Button variant="ghost" onPress={() => refetch()}>Tentar carregar novamente</Button>
      ) : matches.length === 0 ? (
        <AppText size="sm" color={theme.colors.gray[700]}>Nenhum alimento salvo encontrado.</AppText>
      ) : matches.map(food => (
        <View key={food.id} style={styles.savedFoodRow}>
          <Pressable
            onPress={() => onSelect(food)}
            style={styles.savedFoodChoose}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar ${food.name}, ${food.quantity}`}
          >
            <AppText weight="medium" numberOfLines={1}>{food.name}</AppText>
            <AppText size="sm" color={theme.colors.gray[700]}>
              {food.quantity} · P {food.proteins}g · C {food.carbohydrates}g · G {food.fats}g
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => confirmDelete(food)}
            disabled={isDeletingFood}
            style={styles.deleteSavedFood}
            accessibilityRole="button"
            accessibilityLabel={`Excluir ${food.name} dos alimentos salvos`}
          >
            <Trash2Icon size={18} color={theme.colors.support.red} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
