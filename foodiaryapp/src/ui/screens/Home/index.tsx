import { WelcomeModal } from '@ui/components/WelcomeModal';
import { FlatList, RefreshControl, View } from 'react-native';

import { theme } from '@ui/styles/theme';
import { HomeProvider } from '../../../HomeProvider';
import { EmptyState } from './components/EmptyState';
import { Fab } from './components/Fab';
import { FAB_BOTTOM_SPACING, FAB_SIZE } from './components/Fab/styles';
import { FullScreenLoader } from './components/FullScreenLoader';
import { Header } from './components/Header';
import { ItemSeparatorComponent } from './components/ItemSeparatorComponent';
import { MealCard } from './components/MealCard';
import { styles } from './styles';
import { useHomeController } from './useHomeController';

export function Home() {
  const {
    bottom,
    date,
    isInitialLoading,
    isRefreshing,
    meals,
    top,
    isLoading,
    isError,
    handleNextDay,
    handlePreviousDay,
    handleRefresh,
  } = useHomeController();

  if (isInitialLoading) {
    return <FullScreenLoader />;
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <WelcomeModal />

      <HomeProvider
        date={date}
        meals={meals}
        isLoading={isLoading}
        isError={isError}
        onRetry={handleRefresh}
        nextDay={handleNextDay}
        previousDay={handlePreviousDay}
      >
        <FlatList
          data={meals}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottom + 24 + (meals.length > 0 ? FAB_BOTTOM_SPACING + FAB_SIZE : 0) },
          ]}
          ListHeaderComponent={Header}
          ListEmptyComponent={EmptyState}
          ItemSeparatorComponent={ItemSeparatorComponent}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.lime[900]}
              colors={[theme.colors.lime[700]]}
            />
          )}
          renderItem={({ item: meal }) => (
            <MealCard meal={meal} />
          )}
        />
      </HomeProvider>

      {meals.length > 0 && <Fab date={date} />}
    </View>
  );
}
