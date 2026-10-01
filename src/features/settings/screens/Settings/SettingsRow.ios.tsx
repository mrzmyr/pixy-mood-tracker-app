import { Icon } from "@expo/ui";
import { Button, HStack, Image, Label, Spacer } from "@expo/ui/swift-ui";
import { foregroundStyle, tint } from "@expo/ui/swift-ui/modifiers";
import type { SettingsRowProps } from "./types";

// Form tints button labels with the accent color. Settings rows read as plain rows.
const PRIMARY = tint({ type: "hierarchical", style: "primary" });
const TERTIARY = foregroundStyle({ type: "hierarchical", style: "tertiary" });

/**
 * Settings row on iOS: SwiftUI `Button` with a `Label` inside the `Form`.
 *
 * Universal `ListItem` wraps accessories in `RNHostView`, which cannot host
 * an SF Symbol, so iOS builds the row from SwiftUI views. `isLink` adds the
 * system chevron for rows that open another screen.
 */
export const SettingsRow = ({
  title,
  icon,
  onPress,
  isLink = false,
  testID,
}: SettingsRowProps) => (
  <Button onPress={onPress} testID={testID} modifiers={[PRIMARY]}>
    <HStack>
      <Label title={title} icon={<Icon name={icon} size={17} />} />
      <Spacer />
      {isLink && (
        <Image systemName="chevron.right" size={13} modifiers={[TERTIARY]} />
      )}
    </HStack>
  </Button>
);
