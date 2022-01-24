import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { ColorSchemeName, Pressable } from 'react-native';
import { Settings } from 'react-native-feather';
import useColors from '../hooks/useColors';
import { useTranslation } from '../hooks/useTranslation';
import CalendarScreen from '../screens/Calendar';
import LicenseScreen from '../screens/Licenses';
import LogModal from '../screens/LogModal';
import NotFoundScreen from '../screens/NotFound';
import SettingsScreen from '../screens/Settings';
import WebhookScreen from '../screens/Webhook';
import WebhookHistoryEntryScreen from '../screens/WebhookHistoryEntry';

const linking = {
  prefixes: ['pixy://'],
  config: {
    screens: {
    },
  },
};

export default function Navigation({ colorScheme }: { colorScheme: ColorSchemeName }) {
  return (
    <NavigationContainer
      linking={linking}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const colors = useColors();
  const i18n = useTranslation()

  const defaultOptions = {
    headerTintColor: colors.text,
    headerStyle: {
      backgroundColor: colors.background,
    }
  }

  return (
    <Stack.Navigator
      initialRouteName="CalendarScreen"
    >
      <Stack.Screen
        name="CalendarScreen"
        component={CalendarScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          title: i18n.t('calendar'),
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('SettingsScreen')}
              style={{
                padding: 10,
              }}
              accessible={true}
              accessibilityLabel={i18n.t('settings')}
              accessibilityRole={'button'}
            >
              <Settings height={20} color={colors.text} />
            </Pressable>
          )
        })}
      />
      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
      
      <Stack.Group screenOptions={{ 
        presentation: 'modal',
        title: '',
        headerShown: false,
      }}>
        <Stack.Screen name="LogModal" component={LogModal} />
      </Stack.Group>
      
      <Stack.Group
        screenOptions={{ 
          ...defaultOptions,
        }} 
      >
        <Stack.Screen 
          name="SettingsScreen" 
          component={SettingsScreen} 
          options={{ 
            title: i18n.t('settings'),
          }} 
        />
        <Stack.Screen 
          name="WebhookScreen" 
          component={WebhookScreen} 
          options={{ 
            title: i18n.t('webhook'),
          }} 
        />
        <Stack.Screen 
          name="WebhookHistoryEntryScreen" 
          component={WebhookHistoryEntryScreen} 
          options={{ 
            title: '',
          }} 
        />
        <Stack.Screen 
          name="LicenseScreen" 
          component={LicenseScreen} 
          options={{ 
            title: i18n.t('licenses'),
          }} 
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
