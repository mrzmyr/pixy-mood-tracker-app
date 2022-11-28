import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoggerStep } from './components/Logger/config';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {
    }
  }
}

export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type RootStackParamList = {
  tabs: undefined,
  Onboarding: undefined,
  Settings: undefined,
  Colors: undefined,
  Licenses: undefined,
  Calendar: undefined,
  NotFound: undefined;
  Data: undefined;
  Reminder: undefined;
  Privacy: undefined;
  Steps: undefined;
  // PasscodeLocked: undefined;
  Tags: undefined;
  DevelopmentTools: undefined;

  Statistics: undefined;
  StatisticsHighlights: undefined;
  StatisticsYear: {
    date: string;
  };
  StatisticsMonth: {
    date: string;
  };

  LogCreate: {
    date: string;
  }
  LogView: {
    id: string;
  },
  LogEdit: {
    id: string,
    step?: LoggerStep
  },

  DayView: {
    date: string;
  }

  TagEdit: {
    id: string;
  },
  TagCreate: undefined,
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
