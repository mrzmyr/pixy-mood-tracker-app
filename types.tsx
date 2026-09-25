import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LoggerStep } from "@/components/Logger/config";

// React Navigation 6 types useNavigation() through this documented global
// declaration merge; only a namespace plus an extending interface can merge it.
declare global {
  // oxlint-disable-next-line typescript/no-namespace -- React Navigation 6 exposes RootParamList only via the global ReactNavigation namespace.
  namespace ReactNavigation {
    // oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- declaration merging requires an interface that extends RootStackParamList.
    interface RootParamList extends RootStackParamList {}
  }
}

export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// oxlint-disable-next-line typescript/consistent-type-definitions -- ParamListBase needs the implicit index signature that only type aliases have.
export type RootStackParamList = {
  tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  Onboarding: undefined;
  Settings: undefined;
  Colors: undefined;
  Licenses: undefined;
  Calendar: undefined;
  NotFound: undefined;
  Data: undefined;
  Reminder: undefined;
  Privacy: undefined;
  Steps: undefined;
  // PasscodeLocked: undefined;
  Tags: undefined;
  DevelopmentTools: undefined;

  SettingsTags: undefined;
  SettingsTagsArchive: undefined;

  Statistics: undefined;
  StatisticsHighlights: undefined;
  StatisticsYear: {
    date: string;
  };
  StatisticsMonth: {
    date: string;
  };

  LogCreate: {
    dateTime: string;
    avaliableSteps?: LoggerStep[];
  };
  LogView: {
    id: string;
  };
  LogEdit: {
    id: string;
    step?: LoggerStep;
  };
  LogList: {
    date: string;
  };

  TagEdit: {
    id: string;
  };
  TagCreate: undefined;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;

// oxlint-disable-next-line typescript/consistent-type-definitions -- ParamListBase needs the implicit index signature that only type aliases have.
export type RootTabParamList = {
  Statistics: undefined;
  Calendar: undefined;
  Settings: undefined;
};

export type RootTabScreenProps<Screen extends keyof RootTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, Screen>,
    NativeStackScreenProps<RootStackParamList>
  >;
