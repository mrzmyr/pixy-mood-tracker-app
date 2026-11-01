import { useMaterialColors } from "@expo/ui/jetpack-compose";
import { semantics } from "@expo/ui/jetpack-compose/modifiers";
import type { ModifierConfig } from "@expo/ui/jetpack-compose/modifiers";
import type { UniversalTextStyle } from "@expo/ui";
import { getTextStyle } from "@/components/typography";
import type {
  SecondaryText,
  SettingsRowProps,
  SwitchPlatformProps,
} from "./types";

/**
 * Android details for the Material 3 list. iOS:
 * [platform.ts](./platform.ts).
 */

/** The `style.backgroundColor` already paints the list. */
export const formModifiers: ModifierConfig[] = [];

/**
 * Compose shows the title as its own text, so the switch gets the title as
 * its TalkBack name.
 */
export const switchProps = (label: string): SwitchPlatformProps => ({
  modifiers: [semantics({ contentDescription: label })],
});

/** Visible switch title. */
export const switchTitleModifiers: ModifierConfig[] = [];

/** `clickable` already gives TalkBack the tap action. */
export const pressableRowModifiers = (
  _kind: NonNullable<SettingsRowProps["kind"]>
): ModifierConfig[] => [];

/** Status text: Material on-surface-variant color. */
export const useSecondaryText = (): SecondaryText => {
  const colors = useMaterialColors();
  return { textStyle: { color: colors.onSurfaceVariant } };
};

/** Section footer: Material supporting text. */
export const useFooterTextStyle = (): UniversalTextStyle | undefined => {
  const colors = useMaterialColors();
  return {
    // SAFETY: a non-strong copy style holds only numeric fontSize and
    // lineHeight, both valid UniversalTextStyle fields.
    ...(getTextStyle("copy", 14) as UniversalTextStyle),
    color: colors.onSurfaceVariant,
  };
};
