import { RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { Greetings } from '@ui/screens/Greetings';
import { Onboarding } from '@ui/screens/Onboarding';
import { SignIn } from '@ui/screens/SignIn';

type AuthStackParamList = {
  Greetings: undefined;
  SignIn: undefined;
  Onboarding: undefined;
};

export type AuthStackNavigationProps = NativeStackNavigationProp<AuthStackParamList>;

export type AuthStackScreenProps<
  TRouteName extends keyof AuthStackParamList,
> = NativeStackScreenProps<AuthStackParamList, TRouteName>;

export type AuthStackRouteProps<
  TRouteName extends keyof AuthStackParamList,
> = RouteProp<AuthStackParamList, TRouteName>;

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="Greetings"
        component={Greetings}
      />
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="Onboarding" component={Onboarding} />
    </Stack.Navigator>
  );
}
