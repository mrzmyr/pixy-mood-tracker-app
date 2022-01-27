import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import { Pressable } from 'react-native';
import { ArrowLeft, Settings as SettingsIcon } from 'react-native-feather';
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

const BackButton = ({ 
  testID,
}: { 
  testID?: string,
}) => {
  const navigation = useNavigation()
  const colors = useColors()
  
  return (
    <Pressable
      style={{
        padding: 15,
        marginLeft: 5,
      }}
      onPress={() => navigation.goBack()}
      testID={testID}
    >
      <ArrowLeft width={24} color={colors.text} />
    </Pressable>
  );
}

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
              testID='settings'
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
            headerLeft: () => <BackButton testID={'settings-back-button'} />,
          }}
        />
        <Stack.Screen 
          name="Webhook" 
          component={Webhook} 
          options={{ 
            title: i18n.t('webhook'),
            headerLeft: () => <BackButton testID={'webhook-back-button'} />,
          }} 
        />
        <Stack.Screen 
          name="WebhookHistoryEntry" 
          component={WebhookHistoryEntry} 
          options={{ 
            title: '',
            headerLeft: () => <BackButton testID={'webhook-history-entry-back-button'} />,
          }} 
        />
        <Stack.Screen 
          name="Licenses" 
          component={Licenses} 
          options={{ 
            title: i18n.t('licenses'),
            headerLeft: () => <BackButton testID={'licenses-back-button'} />,
          }} 
        />
        <Stack.Screen 
          name="Scales" 
          component={Scales} 
          options={{ 
            title: i18n.t('scales'),
            headerLeft: () => <BackButton testID={'scales-back-button'} />,
          }} 
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
