import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LoggerStep } from "@/features/logger/config";

// React Navigation 6 types useNavigation() through this documented global
// declaration merge; only a namespace plus an extending interface can merge it.
declare global {
  // oxlint-disable-next-line typescript/no-namespace -- React Navigation 6 exposes RootParamList only via the global ReactNavigation namespace.
  namespace ReactNavigation {
    // oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- declaration merging requires an interface that extends RootStackParamList.
    interface RootParamList extends RootStackParamList {}
  }
}

/** Partial `T` that still requires the identifying keys `K`, for patch updates. */
export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Route params for the root native stack.
 *
 * Keep in sync with `NAVIGATION_LINKING` in `src/navigation/index.tsx`;
 * `date` params are part of deep link paths (for example
 * `pixy://statistics/month/:date`). `LogView` has no registered screen.
 */
// oxlint-disable-next-line typescript/consistent-type-definitions -- ParamListBase needs the implicit index signature that only type aliases have.
export type RootStackParamList = {
  tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  Onboarding: undefined;
  Settings: undefined;
  Colors: undefined;
  Licenses: undefined;
  Calendar: undefined;
  Data: undefined;
  Reminder: undefined;
  Privacy: undefined;
  Steps: undefined;
  Tags: undefined;
  DevelopmentTools: undefined;

  SettingsTags: undefined;
  SettingsTagsArchive: undefined;

  Statistics: undefined;
  StatisticsHighlights: undefined;
  StatisticsYear: {
    /** Local `YYYY-MM-DD` date in the year; invalid values fall back to today. */
    date: string;
  };
  StatisticsMonth: {
    /** Local `YYYY-MM-DD` date in the month; invalid values fall back to today. */
    date: string;
  };

  LogCreate: {
    /** ISO timestamp used as the new entry's `dateTime`. */
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
    /** Local `YYYY-MM-DD` day whose entries are listed. */
    date: string;
  };

  TagEdit: {
    id: string;
  };
  TagCreate: undefined;
};

/**
 * Props for screens registered on the root stack; tab screens use
 * {@link RootTabScreenProps}.
 */
export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;

/** Route params for the bottom tab navigator nested under the `tabs` route. */
// oxlint-disable-next-line typescript/consistent-type-definitions -- ParamListBase needs the implicit index signature that only type aliases have.
export type RootTabParamList = {
  Statistics: undefined;
  Calendar: undefined;
  Settings: undefined;
};

/**
 * Screen props for a bottom tab screen; `navigation` can also reach every
 * root stack route.
 */
export type RootTabScreenProps<Screen extends keyof RootTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, Screen>,
    NativeStackScreenProps<RootStackParamList>
  >;
