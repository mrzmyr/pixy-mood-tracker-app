/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {
    }
  }
}

export type RootStackParamList = {
  BottomTabs: undefined,
  Onboarding: undefined,
  Settings: undefined,
  Scales: undefined,
  Webhook: undefined,
  WebhookEntry: {
    entry: any,
  },
  Licenses: undefined,
  Calendar: undefined,
  Modal: undefined;
  NotFound: undefined;
  Data: undefined;
  Reminder: undefined;
  Privacy: undefined;
  PasscodeLocked: undefined;
  TagsModal: undefined;
  DevelopmentStatistics: undefined;
  LogView: {
    date: string,
  },
  LogEdit: {
    date: string,
  },
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  Screen
>;

export type RootTabParamList = {
  CalendarScreen: undefined;
  SettingsScreen: undefined;
};

export type RootTabScreenProps<Screen extends keyof RootTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, Screen>,
  NativeStackScreenProps<RootStackParamList>
>;
