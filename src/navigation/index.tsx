import useColors from '@/hooks/useColors';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Platform, View, useColorScheme } from 'react-native';
import * as Sentry from 'sentry-expo';
import { RootStackParamList } from '../../types';
import {
  BotLogger,
  ColorsScreen,
  DataScreen,
  LogList,
  LicensesScreen,
  LogCreate,
  LogEdit,
  NotFoundScreen,
  PrivacyScreen,
  ReminderScreen, SettingsScreen, StatisticsHighlights, TagCreate, TagEdit, SettingsTags, SettingsTagsArchive
} from '../screens';

import Providers from '@/components/Providers';
import Colors from '@/constants/Colors';
import { initializeDayjs, t } from '@/helpers/translation';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAnonymizer } from '@/hooks/useAnonymizer';
import { useLogState } from '@/hooks/useLogs';
import { useSettings } from '@/hooks/useSettings';
import { useTagsState } from '@/hooks/useTags';
import { getItemsCountPerDayAverage, getItemsCoverage } from '@/lib/utils';
import dayjs from 'dayjs';
import { enableScreens } from 'react-native-screens';
import { DevelopmentTools } from '../screens/DevelopmentTools';
import { Onboarding } from '../screens/Onboarding';
import { StatisticsMonthScreen } from '../screens/StatisticsMonth';
import { StatisticsYearScreen } from '../screens/StatisticsYear';
import { StepsScreen } from '../screens/Steps';
import { Tags } from '../screens/Tags';
import { BackButton } from './BackButton';
import { BottomTabs } from './BottomTabs';
import { BotLoggerEmotions } from '@/screens/BotLogger/Emotions';
import { BotLoggerTags } from '@/screens/BotLogger/Tags';

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
      Steps: 'settings/steps',
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
      LogList: 'days/:date',
      LogCreate: 'logs/create/:dateTime',
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

  useEffect(() => {
    if (settings.loaded && !hasActionDone('onboarding')) {
      navigation.navigate('Onboarding')
    }
    if (settings.loaded && !analytics.isIdentified) {
      analytics.identify({
        tags: tags.map(tag => anonymizeTag(tag)),
        tagsCount: tags.length,

        itemsCount: logState.items.length,
        itemsCoverage: getItemsCoverage(logState.items),
        itemsCountPerDayAverage: getItemsCountPerDayAverage(logState.items),
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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <Stack.Navigator
        initialRouteName="tabs"
        screenOptions={{
          navigationBarColor: colors.tabsBackground,
        }}
      >
        <Stack.Screen
          name="tabs"
          component={BottomTabs}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Oops!' }} />

        <>
          <Stack.Group
            screenOptions={{
              title: '',
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            <Stack.Screen
              name="BotLogger"
              component={BotLogger}
            />
          </Stack.Group>
          <Stack.Group
            screenOptions={{
              title: '',
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            <Stack.Screen
              name="BotLoggerEmotions"
              component={BotLoggerEmotions}
            />
          </Stack.Group>
          <Stack.Group
            screenOptions={{
              title: '',
              presentation: 'modal',
              headerShown: false,
              gestureEnabled: false,
            }}
          >
            <Stack.Screen
              name="BotLoggerTags"
              component={BotLoggerTags}
            />
          </Stack.Group>
        </>

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
            name="LogList"
            component={LogList}
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
            name="SettingsTags"
            component={SettingsTags}
            options={{
              title: t('tags'),
              ...defaultPageOptions,
            }}
          />
          <Stack.Screen
            name="SettingsTagsArchive"
            component={SettingsTagsArchive}
            options={{
              title: t('archive_tag'),
              ...defaultPageOptions,
            }}
          />
          <Stack.Screen
            name="Steps"
            component={StepsScreen}
            options={{
              title: t('steps'),
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
    </View>
    // )
  );
}
