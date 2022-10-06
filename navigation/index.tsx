import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Platform, Pressable, Text, useColorScheme, View } from 'react-native';
import { ArrowLeft, Calendar as CalendarIcon, PieChart, Settings as SettingsIcon } from 'react-native-feather';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import useColors from '../hooks/useColors';
import { useSegment } from "../hooks/useSegment";
import { useTranslation } from '../hooks/useTranslation';
import {
  CalendarScreen,
  DataScreen,
  LicensesScreen,
  LogEdit,
  LogView,
  NotFoundScreen,
  PrivacyScreen,
  ReminderScreen,
  ScaleScreen,
  SettingsScreen, StatisticsScreen, WebhookEntryScreen,
  StatisticsHighlights,
  WebhookScreen,
  TagEdit,
  TagCreate,
} from '../screens';
import { RootStackParamList } from '../types';

import { enableScreens } from 'react-native-screens';
import LinkButton from '../components/LinkButton';
import { useCalendarFilters } from '../hooks/useCalendarFilters';
import useHaptics from '../hooks/useHaptics';
import { useSettings } from '../hooks/useSettings';
import { Onboarding } from '../screens/Onboarding';
import { Tags } from '../screens/Tags';
import { DevelopmentStatistics } from '../screens/DevelopmentStatistics';

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
  {
    name: 'Statistics',
    component: StatisticsScreen,
    icon: PieChart,
    path: 'statistics',
  },
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
  const haptics = useHaptics();
  const { t } = useTranslation()
  
  return (
    <View 
      style={{ 
        flexDirection: 'row',
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
            onPress={async () => {
              await haptics.selection();
              onPress?.();
            }}
            style={{ 
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: isFocused ? colors.tabsTextActive : 'transparent',
                width: '50%',
                height: 2,
                marginTop: -1,
                marginBottom: 4,
              }}
            />
            <Icon width={20} color={isFocused ? colors.tabsIconActive : colors.tabsIconInactive} />
            <Text 
              style={{ 
                color: isFocused ? colors.tabsTextActive : colors.tabsTextInactive,
                fontSize: 12,
                fontWeight: '700',
                marginTop: 2,
                marginBottom: 4,
              }}
            >{t(label.toLowerCase())}</Text>
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
  const { t } = useTranslation()
  const calendarFilters = useCalendarFilters()

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
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          headerShown: false,
          tabBarTestID: 'statistics',
          title: t('statistics'),
        })}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          headerRight: () => (
            <View style={{ paddingRight: 16 }}>
              <LinkButton 
                onPress={() => {
                  if(calendarFilters.isOpen) {
                    calendarFilters.close()
                  } else {
                    calendarFilters.open()
                  }
                }} 
                testID="filters" 
                type='primary'
              >{t('calendar_filters')} {calendarFilters.isFiltering ? `(${calendarFilters.filterCount})` : ''}</LinkButton>
            </View>
          ),
          tabBarTestID: 'calendar',
          title: t('calendar'),
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          ...defaultOptions,
          headerShown: false,
          tabBarTestID: 'settings',
          title: t('settings'),
        })}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const colors = useColors();
  const i18n = useTranslation()
  const segment = useSegment()
  const { settings, hasActionDone } = useSettings()
  const navigation = useNavigation()
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

  useEffect(() => {
    if(settings.loaded && !hasActionDone('onboarding')) {
      navigation.navigate('Onboarding')
    }
  }, [settings.loaded])


  const defaultPageOptions = {
    headerLeft: () => Platform.OS === 'ios' ? null : <BackButton testID={'settings-back-button'} />
  }
  
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
            const routes = e.data.state.routes.map(r => {
              if(r.state) {
                return `${r.name} > ${r.state.routeNames[r.state.index]}`
              }
              return r.name
            });
            segment.screen(routes.join(' > '), { routes })
          },
        }}
        screenOptions={stackScreenOptions}
        initialRouteName="BottomTabs"
      >
        <Stack.Screen
          name="BottomTabs"
          component={BottomTabs}
          options={{ 
            headerShown: false,
          }}
        />

        <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />
        
        <Stack.Group 
          screenOptions={{ 
            title: '',
            presentation: 'modal',
            gestureEnabled: false,
            headerShown: false,
          }}
        >
          <Stack.Screen 
            name="LogEdit" 
            component={LogEdit} 
          />
        </Stack.Group>

        <Stack.Group 
          screenOptions={{ 
            title: '',
            presentation: 'modal',
            headerShown: false,
          }}
        >
          <Stack.Screen 
            name="LogView" 
            component={LogView} 
          />
        </Stack.Group>

        <Stack.Group 
          screenOptions={{ 
            title: '',
            presentation: 'modal',
            gestureEnabled: false,
            headerShown: false,
          }}
        >
          <Stack.Screen 
            name="Onboarding" 
            component={Onboarding} 
          />
        </Stack.Group>
        <Stack.Group 
          screenOptions={{ 
            presentation: 'formSheet',
            headerShown: false,
          }}
        >
          <Stack.Screen 
            name="Tags" 
            component={Tags} 
          />
          <Stack.Screen 
            name="TagCreate" 
            component={TagCreate}
          />
          <Stack.Screen 
            name="TagEdit" 
            component={TagEdit}
          />
        </Stack.Group>
        
        <Stack.Group
          screenOptions={{ 
            ...defaultOptions,
            headerBackTitle: '',
          }} 
        >
          <Stack.Screen 
            name="StatisticsHighlights"
            component={StatisticsHighlights}
            options={{ 
              title: i18n.t('statistics_highlights'),
              ...defaultPageOptions,
            }}
          />
        </Stack.Group>
        <Stack.Group
          screenOptions={{ 
            ...defaultOptions,
            headerBackTitle: '',
          }} 
        >
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ 
              title: i18n.t('settings'),
              ...defaultPageOptions,
            }}
          />
          <Stack.Screen 
            name="Reminder" 
            component={ReminderScreen}
            options={{ 
              title: i18n.t('reminder'),
              ...defaultPageOptions,
          }}
          />
          <Stack.Screen 
            name="Privacy" 
            component={PrivacyScreen}
            options={{ 
              title: i18n.t('privacy'),
              ...defaultPageOptions,
            }}
          />
          <Stack.Screen
            name="Webhook" 
            component={WebhookScreen} 
            options={{ 
              title: i18n.t('webhook'),
              ...defaultPageOptions,
            }} 
          />
          <Stack.Screen 
            name="WebhookEntry" 
            component={WebhookEntryScreen} 
            options={{ 
              title: '',
              ...defaultPageOptions,
            }} 
          />
          <Stack.Screen 
            name="Licenses" 
            component={LicensesScreen} 
            options={{ 
              title: i18n.t('licenses'),
              ...defaultPageOptions,
            }} 
          />
          <Stack.Screen 
            name="Scales" 
            component={ScaleScreen} 
            options={{ 
              title: i18n.t('scales'),
              ...defaultPageOptions,
            }} 
          />
          <Stack.Screen 
            name="Data" 
            component={DataScreen} 
            options={{ 
              title: i18n.t('data'),
              ...defaultPageOptions,
            }} 
          />
          <Stack.Screen 
            name="DevelopmentStatistics" 
            component={DevelopmentStatistics} 
            options={{ 
              title: i18n.t('settings_development_statistics'),
              ...defaultPageOptions,
            }} 
          />
        </Stack.Group>
      </Stack.Navigator>
    </SafeAreaProvider>
    // )
  );
}
