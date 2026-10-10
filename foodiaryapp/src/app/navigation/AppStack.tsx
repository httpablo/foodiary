import { RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { EditGoals } from '@ui/screens/EditGoals';
import { Account } from '@ui/screens/Account';
import { EditProfile } from '@ui/screens/EditProfile';
import { Home } from '@ui/screens/Home';
import { MealDetails } from '@ui/screens/MealDetails';
import { EditMeal } from '@ui/screens/EditMeal';

type AppStackParamList = {
  Home: undefined;
  MealDetails: {
    mealId: string;
  };
  EditMeal: {
    mealId: string;
    mode?: 'repeat';
  };
  EditGoals: undefined;
  Account: undefined;
  EditProfile: undefined;
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
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="MealDetails" component={MealDetails} />
      <Stack.Screen name="EditMeal" component={EditMeal} />
      <Stack.Screen name="EditGoals" component={EditGoals} />
      <Stack.Screen name="Account" component={Account} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
    </Stack.Navigator>
  );
}
