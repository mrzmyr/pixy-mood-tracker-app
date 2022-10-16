/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from './constants/Colors';
import { Tag as ITag } from './hooks/useTags';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {
    }
  }
}

export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type RootStackParamList = {
  BottomTabs: undefined,
  Onboarding: undefined,
  Settings: undefined,
  Colors: undefined,
  Licenses: undefined,
  Calendar: undefined,
  Modal: undefined;
  NotFound: undefined;
  Data: undefined;
  Reminder: undefined;
  Privacy: undefined;
  PasscodeLocked: undefined;
  Tags: undefined;
  DevelopmentStatistics: undefined;
  StatisticsHighlights: undefined;
  LogView: {
    date: string,
  },
  TagEdit: {
    tag?: ITag,
  },
  TagCreate: undefined,
  LogEdit: {
    date: string,
    slide?: 'rating' | 'tags' | 'message',
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
