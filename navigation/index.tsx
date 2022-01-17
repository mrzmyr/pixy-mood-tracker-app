import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { ColorSchemeName, Pressable } from 'react-native';
import { Settings } from 'react-native-feather';
import useColors from '../hooks/useColors';
import CalendarScreen from '../screens/Calendar';
import LogModal from '../screens/LogModal';
import NotFoundScreen from '../screens/NotFound';
import SettingsScreen from '../screens/Settings';
import WebhookScreen from '../screens/Webhook';
import WebhookHistoryEntryScreen from '../screens/WebhookHistoryEntry';
import LicenseScreen from '../screens/Licenses';
import LinkingConfiguration from './LinkingConfiguration';

export default function Navigation({ colorScheme }: { colorScheme: ColorSchemeName }) {
  return (
    <NavigationContainer
      linking={LinkingConfiguration}
      theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const colors = useColors();

  return (
    <Stack.Navigator
      initialRouteName="CalendarScreen"
    >
      <Stack.Screen
        name="CalendarScreen"
        component={CalendarScreen}
        options={({ navigation }) => ({
          title: 'Calendar',
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('SettingsScreen')}
              style={{
                padding: 10,
              }}
            >
              <Settings height={20} color={colors.text} />
            </Pressable>
          )
        })}
      />
      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
      <Stack.Group screenOptions={{ 
        presentation: 'modal',
        header: ({ scene, previous, navigation }) => null,
      }}>
        <Stack.Screen name="LogModal" component={LogModal} />
      </Stack.Group>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{ title: 'Settings'}} />
      <Stack.Screen name="WebhookScreen" component={WebhookScreen} options={{ title: 'Webhook'}} />
      <Stack.Screen name="WebhookHistoryEntryScreen" component={WebhookHistoryEntryScreen} options={{ title: ''}} />
      <Stack.Screen name="LicenseScreen" component={LicenseScreen} options={{ title: 'Licenses'}} />
    </Stack.Navigator>
  );
}
