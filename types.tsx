/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {
    }
  }
}

export type RootStackParamList = {
  Settings: undefined,
  Scales: undefined,
  Webhook: undefined,
  WebhookHistoryEntry: {
    entry: any,
  },
  Log: {
    date: string,
  },
  Licenses: undefined,
  Calendar: undefined,
  Modal: undefined;
  NotFound: undefined;
  Data: undefined;
  Reminder: undefined;
  Privacy: undefined;
  ReminderModal: undefined;
  PasscodeLocked: undefined;
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
