import { Button, Host } from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Expo UI modifier name.
  buttonBorderShape,
  buttonStyle,
  controlSize,
  labelStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { isGlassEffectAPIAvailable } from "expo-glass-effect";
import { useTheme } from "expo-router";
import useColors from "@/hooks/useColors";
import type { EditActionButtonProps } from "./EditActionButton.types";

const HAS_GLASS = isGlassEffectAPIAvailable();

/** Native circular actions; SwiftUI handles glass, press feedback, and accessibility. */
export const EditActionButton = ({
  action,
  label,
  onPress,
  testID,
}: EditActionButtonProps) => {
  const colors = useColors();
  const { dark } = useTheme();
  const isSave = action === "save";

  let style: Parameters<typeof buttonStyle>[0] = isSave
    ? "borderedProminent"
    : "bordered";
  if (HAS_GLASS) {
    style = isSave ? "glassProminent" : "glass";
  }

  return (
    <Host
      matchContents
      colorScheme={dark ? "dark" : "light"}
      ignoreSafeArea="all"
    >
      <Button
        label={label}
        systemImage={isSave ? "checkmark" : "xmark"}
        role={isSave ? "default" : "cancel"}
        onPress={onPress}
        modifiers={[
          buttonStyle(style),
          // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- Expo UI modifier name.
          buttonBorderShape("circle"),
          controlSize("large"),
          labelStyle("iconOnly"),
          tint(isSave ? colors.primaryButtonBackground : colors.text),
          ...(testID ? [accessibilityIdentifier(testID)] : []),
        ]}
      />
    </Host>
  );
};
