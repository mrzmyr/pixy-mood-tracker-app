import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import OneSignal from 'react-native-onesignal';
import * as Sentry from 'sentry-expo';
import useColors from '../hooks/useColors';
import {
  ColorsScreen,
  DataScreen,
  DayView,
  LicensesScreen,
  LogCreate,
  LogEdit,
  LogView,
  NotFoundScreen,
  PrivacyScreen,
  ReminderScreen, SettingsScreen, StatisticsHighlights, TagCreate, TagEdit
} from '../screens';
import { RootStackParamList, RootStackScreenProps } from '../types';

import dayjs from 'dayjs';
import { enableScreens } from 'react-native-screens';
import Providers from '../components/Providers';
import Colors from '../constants/Colors';
import { ONE_SIGNAL_APP_ID } from '../constants/Config';
import { initializeDayjs, t } from '../helpers/translation';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAnonymizer } from '../hooks/useAnonymizer';
import { useLogState } from '../hooks/useLogs';
import { useSettings } from '../hooks/useSettings';
import { useTagsState } from '../hooks/useTags';
import { getItemsCoverage } from '../lib/utils';
import { DevelopmentTools } from '../screens/DevelopmentTools';
import { Onboarding } from '../screens/Onboarding';
import { Tags } from '../screens/Tags';
import { StatisticsMonthScreen } from '../screens/StatisticsMonth';
import { StatisticsYearScreen } from '../screens/StatisticsYear';
import { BackButton } from './BackButton';
import { BottomTabs } from './BottomTabs';

enableScreens();

const NAVIGATION_LINKING = {
  prefixes: [
    'pixy://',
    Linking.createURL('/'),
  ],
  config: {
    screens: {
      Calendar: 'calendar',
      Onboarding: 'onboarding',

      Settings: 'settings',
      Colors: 'settings/colors',
      Licenses: 'settings/licenses',
      Data: 'settings/data',
      Reminder: 'settings/reminder',
      Privacy: 'settings/privacy',
      DevelopmentTools: 'settings/development-tools',
      // PasscodeLocked: 'passcode-locked',;
      // Tags: 'settings/tags',;
      Statistics: 'statistics',
      StatisticsHighlights: 'statistics/highlights',
      StatisticsMonth: 'statistics/month/:date',
      StatisticsYear: 'statistics/year/:date',
      DayView: 'days/:date',
      LogView: 'logs/:id',
      LogCreate: 'logs/create/:date',
      LogEdit: 'logs/:id/edit',
      Tags: 'tags',
      TagEdit: 'tags/:id',
      TagCreate: 'tags/create',
    },
  },
};

export default function Navigation() {
  const scheme = useColorScheme();

  return (
    <NavigationContainer
      linking={NAVIGATION_LINKING}
      // @ts-ignore
      theme={
        scheme === 'dark' ? {
          dark: true,
          colors: Colors.dark,
        } : {
          dark: false,
          colors: Colors.light,
        }
      }
    >
      <Providers>
        <RootNavigator />
      </Providers>
    </NavigationContainer>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const colors = useColors();
  const { settings, hasActionDone } = useSettings()
  const navigation = useNavigation()
  const analytics = useAnalytics()
  const logState = useLogState();
  const { tags } = useTagsState();
  const { anonymizeTag } = useAnonymizer();
  // const passcode = usePasscode()

  const defaultOptions = {
    headerTintColor: colors.text,
    headerStyle: {
      backgroundColor: colors.background,
    },
    headerShadowVisible: Platform.OS !== 'web',
  }

  const stackScreenOptions: {
    [key: string]: any
  } = {}

  if (Platform.OS === 'android') {
    stackScreenOptions.animation = 'none'
  }

  useEffect(() => {
    if (Platform.OS !== 'web') {
      OneSignal.setAppId(ONE_SIGNAL_APP_ID);

      if (settings.loaded && settings.deviceId !== null) {
        OneSignal.setExternalUserId(settings.deviceId)
      }
    }

    if (settings.loaded && !hasActionDone('onboarding')) {
      navigation.navigate('Onboarding')
    }
    if (settings.loaded && !analytics.isIdentified) {
      analytics.identify({
        tags: tags.map(tag => anonymizeTag(tag)),
        tagsCount: tags.length,

        itemsCount: logState.items.length,
        itemsCoverage: getItemsCoverage(logState.items),
      })
    }

    initializeDayjs();

    if (!__DEV__) {
      Sentry.init({
        dsn: 'https://d98d0f519b324d9cb0c947b8f29cd0cf@o1112922.ingest.sentry.io/6142792',
        enableInExpoDevelopment: false,
      });
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
    <Stack.Navigator
      screenOptions={stackScreenOptions}
      initialRouteName="tabs"
    >
      <Stack.Screen
        name="tabs"
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
          name="LogCreate"
          component={LogCreate}
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
          name="DayView"
          component={DayView}
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
            title: t('statistics_highlights'),
            ...defaultPageOptions,
          }}
        />
        <Stack.Screen
          name="StatisticsYear"
          component={StatisticsYearScreen}
          options={{
            title: dayjs().format('YYYY'),
            headerShown: false,
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
            title: t('settings'),
            ...defaultPageOptions,
          }}
        />
        <Stack.Screen
          name="StatisticsMonth"
          component={StatisticsMonthScreen}
          options={{
            title: t('month_report'),
            headerShown: false,
            ...defaultPageOptions,
          }}
        />
        <Stack.Screen
          name="Reminder"
          component={ReminderScreen}
          options={{
            title: t('reminder'),
            ...defaultPageOptions,
          }}
        />
        <Stack.Screen
          name="Privacy"
          component={PrivacyScreen}
          options={{
            title: t('privacy'),
            ...defaultPageOptions,
          }}
        />
        <Stack.Screen
          name="Licenses"
          component={LicensesScreen}
          options={{
            title: t('licenses'),
            ...defaultPageOptions,
          }}
        />
        <Stack.Screen
          name="Colors"
          component={ColorsScreen}
          options={{
            title: t('colors'),
            ...defaultPageOptions,
          }}
        />
        <Stack.Screen
          name="Data"
          component={DataScreen}
          options={{
            title: t('data'),
            ...defaultPageOptions,
          }}
        />
        <Stack.Screen
          name="DevelopmentTools"
          component={DevelopmentTools}
          options={{
            title: t('settings_development_statistics'),
            ...defaultPageOptions,
          }}
        />
      </Stack.Group>
    </Stack.Navigator>
    // )
  );
}
