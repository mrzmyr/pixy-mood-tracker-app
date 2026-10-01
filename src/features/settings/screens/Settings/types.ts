import type { Icon } from "@expo/ui";

/** Platform icon from `Icon.select`: SF Symbol on iOS, Material Symbol XML on Android. */
export type SettingsIcon = ReturnType<typeof Icon.select>;

/** Props shared by the iOS and Android `SettingsRow` implementations. */
export interface SettingsRowProps {
  title: string;
  icon: SettingsIcon;
  onPress: () => void;
  /** Adds a trailing chevron for rows that open another screen. */
  isLink?: boolean;
  testID?: string;
}
