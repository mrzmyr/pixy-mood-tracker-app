import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Platform, Pressable, Text, useColorScheme } from 'react-native';
import { ArrowLeft, Calendar as CalendarIcon, PieChart, Settings as SettingsIcon } from 'react-native-feather';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import useColors from '../hooks/useColors';
import useHaptics from '../hooks/useHaptics';
import { usePasscode } from '../hooks/usePasscode';
import { useSegment } from "../hooks/useSegment";
import { useTranslation } from '../hooks/useTranslation';
import {
  CalendarScreen, DataScreen, LicensesScreen, LogModal, NotFoundScreen, PrivacyScreen, ReminderModal, ReminderScreen, ScaleScreen, SettingsScreen, StatisticsScreen, WebhookEntryScreen, WebhookScreen
} from '../screens';
import { RootStackParamList } from '../types';

import { enableScreens } from 'react-native-screens';
enableScreens();

const linking = {
  prefixes: ['pixy://'],
  config: {
    screens: {
      Webhook: {
        path: 'webhook',
        screens: {
          WebhookEntry: {
            path: 'webhook/history/:date',
          },
        },
      }
    },
  },
};

export default function Navigation() {
  const scheme = useColorScheme();
  
  return (
    <NavigationContainer 
      linking={linking}
      theme={scheme === 'dark' ? { 
        dark: true,
        colors: {
          ...Colors.dark,
        }
      } : {
        dark: false,
        colors: {
          ...Colors.light,
        }
      }}
    >
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

const Tab = createBottomTabNavigator();

const BottomTabs = () => {
  const colors = useColors();
  const i18n = useTranslation()
  const haptics = useHaptics()

  const defaultOptions = {
    headerTintColor: colors.text,
    headerStyle: {
      backgroundColor: colors.background,
      shadowColor: 'transparent',
      borderBottomWidth: 1,
      borderBottomColor: colors.headerBorder,
    },
    headerShadowVisible: Platform.OS !== 'web',
    tabBarStyle: {
      borderTopColor: colors.headerBorder,
    },
  }
  
  return (
    <Tab.Navigator
      initialRouteName="Calendar"
      screenOptions={({ route }) => ({
        headerStyle: {
          borderBottomColor: '#fff',
        },
      })}
    >
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          tabBarLabel: ({ color, position, focused }) => (
            <Text style={{ fontSize: 11, color: focused ? colors.tabsIconActive : colors.tabsIconInactive }}>{i18n.t('statistics')}</Text>
          ),
          tabBarIcon: ({ color, size, focused }) => <PieChart width={20} color={focused ? colors.tabsIconActive : colors.tabsIconInactive} />,
          headerShown: false,
          title: i18n.t('statistics'),
        })}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          headerShown: false,
          tabBarLabel: ({ color, position, focused }) => (
            <Text style={{ fontSize: 11, color: focused ? colors.tabsIconActive : colors.tabsIconInactive }}>{i18n.t('calendar')}</Text>
          ),
          tabBarIcon: ({ color, size, focused }) => <CalendarIcon width={20} color={focused ? colors.tabsIconActive : colors.tabsIconInactive} />,
          title: i18n.t('calendar'),
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          tabBarLabel: ({ color, position, focused }) => (
            <Text style={{ fontSize: 11, color: focused ? colors.tabsIconActive : colors.tabsIconInactive }}>{i18n.t('settings')}</Text>
          ),
          tabBarIcon: ({ color, size, focused }) => <SettingsIcon width={20} color={focused ? colors.tabsIconActive : colors.tabsIconInactive} />,
          title: i18n.t('settings'),
        })}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const colors = useColors();
  const i18n = useTranslation()
  const haptics = useHaptics()
  const passcode = usePasscode()
  const segment = useSegment()

  const defaultOptions = {
    headerTintColor: colors.text,
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerShadowVisible: Platform.OS !== 'web',
  }

  const stackScreenOptions = {}
  
  if(Platform.OS === 'android') {
    stackScreenOptions.animation = 'none'
  }
  
  useEffect(() => {
    segment.initialize()
  }, [])

  // if(passcode.isEnabled === null) return null;

  return (
      
    // (passcode.isEnabled && !passcode.isAuthenticated) ? (
    //   <Stack.Navigator
    //     screenOptions={{
    //       animation: 'none'
    //     }}
    //   >
    //     <Stack.Screen 
    //       options={{ headerShown: false }} 
    //       name="PasscodeLocked" 
    //       component={PasscodeLocked} 
    //     />
    //   </Stack.Navigator>
    // ) : (
    <SafeAreaProvider>
      <Stack.Navigator
        initialRouteName="Calendar"
        screenListeners={{
          state: (e) => {
            const path = e.data.state.routes.map(r => {
              if(r.state) {
                return `${r.name} > ${r.state.routeNames[r.state.index]}`
              }
              return r.name
            }).join('');
            segment.screen(path)
          },
        }}
        screenOptions={stackScreenOptions}
      >
        <Stack.Screen
          name="BottomTabs"
          component={BottomTabs}
          options={{ headerShown: false }}
        />

        <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
        
        <Stack.Group screenOptions={{ 
          title: '',
          presentation: 'modal',
          headerShown: false,
        }}>
          <Stack.Screen 
            name="Log" 
            component={LogModal} 
          />
        </Stack.Group>

        <Stack.Group screenOptions={{ 
          title: '',
          presentation: 'modal',
          headerShown: false,
        }}>
          <Stack.Screen 
            name="ReminderModal" 
            component={ReminderModal} 
          />
        </Stack.Group>
        
        <Stack.Group
          screenOptions={{ 
            ...defaultOptions,
          }} 
        >
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ 
              title: i18n.t('settings'),
              headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'settings-back-button'} />,
            }}
          />
          <Stack.Screen 
            name="Reminder" 
            component={ReminderScreen}
            options={{ 
              title: i18n.t('reminder'),
              headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'reminder-back-button'} />,
            }}
          />
          <Stack.Screen 
            name="Privacy" 
            component={PrivacyScreen}
            options={{ 
              title: i18n.t('privacy'),
              headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'privacy-back-button'} />,
            }}
          />
          <Stack.Screen
            name="Webhook" 
            component={WebhookScreen} 
            options={{ 
              title: i18n.t('webhook'),
              headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'webhook-back-button'} />,
            }} 
          />
          <Stack.Screen 
            name="WebhookEntry" 
            component={WebhookEntryScreen} 
            options={{ 
              title: '',
              headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'webhook-history-entry-back-button'} />,
            }} 
          />
          <Stack.Screen 
            name="Licenses" 
            component={LicensesScreen} 
            options={{ 
              title: i18n.t('licenses'),
              headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'licenses-back-button'} />,
            }} 
          />
          <Stack.Screen 
            name="Scales" 
            component={ScaleScreen} 
            options={{ 
              title: i18n.t('scales'),
              headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'scales-back-button'} />,
            }} 
          />
          <Stack.Screen 
            name="Data" 
            component={DataScreen} 
            options={{ 
              title: i18n.t('data'),
              headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'data-back-button'} />,
            }} 
          />
        </Stack.Group>
      </Stack.Navigator>
      </SafeAreaProvider>
    // )
  );
}
