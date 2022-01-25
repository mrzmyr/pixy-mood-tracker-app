import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { ColorSchemeName, Pressable } from 'react-native';
import { Settings as SettingsIcon } from 'react-native-feather';
import useColors from '../hooks/useColors';
import { useTranslation } from '../hooks/useTranslation';
import Calendar from '../screens/Calendar';
import Licenses from '../screens/Licenses';
import LogModal from '../screens/LogModal';
import NotFound from '../screens/NotFound';
import Scales from '../screens/Scales';
import Settings from '../screens/Settings';
import Webhook from '../screens/Webhook';
import WebhookHistoryEntry from '../screens/WebhookHistoryEntry';
import { RootStackParamList } from '../types';

const linking = {
  prefixes: ['pixy://'],
  config: {
    screens: {
    },
  },
};

export default function Navigation() {
  return (
    <NavigationContainer linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

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
      initialRouteName="Calendar"
    >
      <Stack.Screen
        name="Calendar"
        component={Calendar}
        options={({ navigation }) => ({
          ...defaultOptions,
          title: i18n.t('calendar'),
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={{
                padding: 10,
              }}
              accessible={true}
              accessibilityLabel={i18n.t('settings')}
              accessibilityRole={'button'}
            >
              <SettingsIcon height={20} color={colors.text} />
            </Pressable>
          )
        })}
      />

      <Stack.Screen name="NotFound" component={NotFound} options={{ title: 'Oops!' }} />
      
      <Stack.Group screenOptions={{ 
        title: '',
        presentation: 'modal',
        headerShown: false,
      }}>
        <Stack.Screen 
          name="LogModal" 
          component={LogModal} 
        />
      </Stack.Group>
      
      <Stack.Group
        screenOptions={{ 
          ...defaultOptions,
        }} 
      >
        <Stack.Screen 
          name="Settings" 
          component={Settings} 
          options={{ 
            title: i18n.t('settings'),
          }} 
        />
        <Stack.Screen 
          name="Webhook" 
          component={Webhook} 
          options={{ 
            title: i18n.t('webhook'),
          }} 
        />
        <Stack.Screen 
          name="WebhookHistoryEntry" 
          component={WebhookHistoryEntry} 
          options={{ 
            title: '',
          }} 
        />
        <Stack.Screen 
          name="Licenses" 
          component={Licenses} 
          options={{ 
            title: i18n.t('licenses'),
          }} 
        />
        <Stack.Screen 
          name="Scales" 
          component={Scales} 
          options={{ 
            title: i18n.t('scales'),
          }} 
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
