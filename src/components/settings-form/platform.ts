import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHidden,
  foregroundStyle,
  labelsHidden,
  scrollContentBackground,
} from "@expo/ui/swift-ui/modifiers";
import type { ModifierConfig } from "@expo/ui/swift-ui/modifiers";
import type { UniversalTextStyle } from "@expo/ui";
import type {
  SecondaryText,
  SettingsRowProps,
  SwitchPlatformProps,
} from "./types";

/**
 * iOS details for the SwiftUI `Form`. Android:
 * [platform.android.ts](./platform.android.ts).
 */

/** Hide the system grouped background so the app background shows. */
export const formModifiers: ModifierConfig[] = [
  scrollContentBackground("hidden"),
];

/**
 * SwiftUI `Toggle` keeps `label` as its VoiceOver name but hides it, so the
 * toggle is only the switch. A full-width toggle would put its center, where
 * e2e taps land, on the label, which does not toggle.
 */
export const switchProps = (label: string): SwitchPlatformProps => ({
  label,
  modifiers: [labelsHidden()],
});

/** Visible switch title: VoiceOver reads the toggle instead. */
export const switchTitleModifiers: ModifierConfig[] = [accessibilityHidden()];

/** One VoiceOver element per row, with the trait that matches the action. */
export const pressableRowModifiers = (
  kind: NonNullable<SettingsRowProps["kind"]>
): ModifierConfig[] => [
  accessibilityElement("combine"),
  accessibilityAddTraits([kind === "link" ? "isLink" : "isButton"]),
];

/** Status text: secondary label color. */
export const useSecondaryText = (): SecondaryText => ({
  modifiers: [foregroundStyle({ type: "color", color: "secondaryLabel" })],
});

/** Section footer: SwiftUI styles footer text itself. */
export const useFooterTextStyle = (): UniversalTextStyle | undefined =>
  undefined;
