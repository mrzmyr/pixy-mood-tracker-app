import type { SwitchProps, UniversalTextStyle } from "@expo/ui";
import type { ReactElement, ReactNode } from "react";
import type { FeatureFlag } from "@/state/feature-flags/keys";

/** One group of rows. Must be a direct child of `SettingsForm`. */
export interface SettingsSectionProps {
  /** Short heading above the rows. */
  title?: string;
  /** Help text under the rows. */
  footer?: string;
  /** Web only: outline the section while flag highlight is on. */
  flag?: FeatureFlag;
  children?: ReactNode;
}

/** On/off row. `label` is the visible title and the screen reader name. */
export interface SettingsSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
  /** React Native icon, 20 px, before the label. */
  icon?: ReactElement;
}

/**
 * Text row. `kind`: `navigation` opens another page (iOS chevron), `button`
 * runs an action, `link` leaves the app.
 */
export interface SettingsRowProps {
  title: string;
  /** Status text at the trailing edge, such as "On". */
  value?: string;
  onPress?: () => void;
  kind?: "navigation" | "button" | "link";
  testID?: string;
  /** React Native icon, 20 px, before the title. */
  icon?: ReactElement;
  /** React Native control at the trailing edge, such as a time picker. */
  accessory?: ReactElement;
}

/** SwiftUI or Compose modifier list. */
type Modifiers = NonNullable<SwitchProps["modifiers"]>;

/** Platform props for the native switch: screen reader name and modifiers. */
export interface SwitchPlatformProps {
  label?: string;
  modifiers: Modifiers;
}

/** Platform styling for secondary text. */
export interface SecondaryText {
  textStyle?: UniversalTextStyle;
  modifiers?: Modifiers;
}
