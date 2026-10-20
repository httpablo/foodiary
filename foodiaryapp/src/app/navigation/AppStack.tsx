import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { Achievements } from '@ui/screens/Achievements';
import { EditGoals } from '@ui/screens/EditGoals';
import { Account } from '@ui/screens/Account';
import { EditProfile } from '@ui/screens/EditProfile';
import { Home } from '@ui/screens/Home';
import { MealDetails } from '@ui/screens/MealDetails';
import { EditMeal } from '@ui/screens/EditMeal';
import { WeeklySummaryScreen } from '@ui/screens/WeeklySummary';
import { MealPlanner } from '@ui/screens/MealPlanner';
import { MealHistory } from '@ui/screens/MealHistory';
import { NutritionLabelScanner } from '@ui/screens/NutritionLabelScanner';
import { MyWeight } from '@ui/screens/MyWeight';
import { WeightGoalSetup } from '@ui/screens/WeightGoalSetup';
import type { SavedFood } from '@app/types/SavedFood';

type AppStackParamList = {
  Home: undefined;
  MealDetails: {
    mealId: string;
  };
  EditMeal: {
    mealId: string;
    mode?: 'repeat';
  } | {
    mode: 'create';
    date: string;
    timezoneOffsetMinutes: number;
    initialFood?: Omit<SavedFood, 'id'>;
  };
  EditGoals: undefined;
  Account: undefined;
  EditProfile: undefined;
  WeeklySummary: undefined;
  MealPlanner: undefined;
  MealHistory: undefined;
  NutritionLabelScanner: { mealDate: string; timezoneOffsetMinutes: number } | undefined;
  MyWeight: undefined;
  WeightGoalSetup: undefined;
  Achievements: undefined;
};

export type AppStackNavigationProps = NativeStackNavigationProp<AppStackParamList>;

export type AppStackScreenProps<
  TRouteName extends keyof AppStackParamList,
> = NativeStackScreenProps<AppStackParamList, TRouteName>;

export type AppStackRouteProps<
  TRouteName extends keyof AppStackParamList,
> = RouteProp<AppStackParamList, TRouteName>;

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <BottomSheetModalProvider>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="MealDetails" component={MealDetails} />
        <Stack.Screen name="EditMeal" component={EditMeal} />
        <Stack.Screen name="EditGoals" component={EditGoals} />
        <Stack.Screen name="Account" component={Account} />
        <Stack.Screen name="EditProfile" component={EditProfile} />
        <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
        <Stack.Screen name="MealPlanner" component={MealPlanner} />
        <Stack.Screen name="MealHistory" component={MealHistory} />
        <Stack.Screen name="NutritionLabelScanner" component={NutritionLabelScanner} />
        <Stack.Screen name="MyWeight" component={MyWeight} />
        <Stack.Screen name="WeightGoalSetup" component={WeightGoalSetup} />
        <Stack.Screen name="Achievements" component={Achievements} />
      </Stack.Navigator>
    </BottomSheetModalProvider>
  );
}
