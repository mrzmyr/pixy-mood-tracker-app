import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Platform, Pressable, Text, useColorScheme, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { ArrowLeft, Calendar as CalendarIcon, Settings as SettingsIcon } from 'react-native-feather';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import useColors from '../hooks/useColors';
import { useSegment } from "../hooks/useSegment";
import { useTranslation } from '../hooks/useTranslation';
import {
  CalendarScreen,
  DataScreen,
  LicensesScreen,
  LogModal,
  NotFoundScreen,
  PrivacyScreen,
  ReminderModal,
  ReminderScreen,
  ScaleScreen,
  SettingsScreen, WebhookEntryScreen,
  WebhookScreen
} from '../screens';
import { RootStackParamList } from '../types';

import { enableScreens } from 'react-native-screens';
import { TagsModal } from '../screens/Tags';
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


const ROUTES = [
  // {
  //   name: 'Statistics',
  //   component: StatisticsScreen,
  //   icon: PieChart,
  //   path: 'statistics',
  // },
  {
    name: 'Calendar',
    component: CalendarScreen,
    icon: CalendarIcon,
    path: 'calendar',
  },
  {
    name: 'Settings',
    component: SettingsScreen,
    icon: SettingsIcon,
    path: 'settings',
  }
];

function MyTabBar({ state, descriptors, navigation }) {
  const colors = useColors()
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      style={{ 
        flexDirection: 'row',
        paddingTop: 4,
        marginBottom: insets.bottom,
        borderTopColor: colors.headerBorder,
        borderTopWidth: 1,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // The `merge: true` option makes sure that the params inside the tab screen are preserved
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        const Icon = ROUTES.find(r => r.name === route.name)?.icon;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={{ 
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon width={20} color={isFocused ? colors.tabsIconActive : colors.tabsIconInactive} />
            <Text 
              style={{ 
                color: isFocused ? colors.tabsTextActive : colors.tabsTextInactive,
                fontSize: 14,
                marginTop: 4,
              }}
            >{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
      tabBar={props => <MyTabBar {...props} />}
    >
      {/* <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          tabBarTestID: 'statistics',
          headerShown: false,
          title: i18n.t('statistics'),
        })}
      /> */}
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          headerShown: false,
          tabBarTestID: 'calendar',
          title: i18n.t('calendar'),
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          headerShown: false,
          tabBarTestID: 'settings',
          title: i18n.t('settings'),
        })}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const colors = useColors();
  const i18n = useTranslation()
  const segment = useSegment()
  // const passcode = usePasscode()

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
        
        <Stack.Group 
          screenOptions={{ 
            title: '',
            presentation: 'modal',
            headerShown: false,
          }}>
          <Stack.Screen 
            name="Log" 
            component={LogModal} 
          />
        </Stack.Group>

        <Stack.Group 
          screenOptions={{ 
            presentation: 'modal',
            headerShown: false,
          }}>
            <Stack.Screen 
            name="TagsModal" 
            component={TagsModal} 
          />
        </Stack.Group>

        <Stack.Group 
          screenOptions={{ 
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
