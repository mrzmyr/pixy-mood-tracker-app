import { Button, Host, Image } from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  accessibilityLabel,
  // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- SwiftUI modifier name from @expo/ui.
  buttonBorderShape as buttonOutline,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import LinkButton from "@/components/link-button";
import { HAS_FLOATING_HEADER } from "@/constants/floating-header";
import useColors from "@/hooks/use-colors";
import type { HeaderButtonProps } from "./header-button.types";

export type {
  HeaderButtonKind,
  HeaderButtonProps,
} from "./header-button.types";

// Same symbols as native bar items (`Stack.Toolbar`, feedback screen).
const SYMBOLS = {
  cancel: "xmark",
  confirm: "checkmark",
  send: "arrow.up",
} as const;

/** Visible circle of iOS 26 bar buttons. */
const SIZE = 44;
const GLYPH_SIZE = 21;
/** Symbol frame; the regular glass button pads it to `SIZE`. */
const LABEL_SIZE = 30;

/**
 * iOS button of a modal header ([Modals](../../DESIGN.md#components)).
 * iOS 26: SwiftUI Liquid Glass circle with an SF Symbol, the way native bar
 * items look. Cancel is plain glass, confirm and send are prominent in the
 * tint color. `testID` becomes the accessibility identifier, so e2e flows can
 * tap it. In a native bar, place it with `hidesSharedBackground`, else the
 * bar draws a second glass capsule around it
 * ([`getModalBarOptions`](./modal-bar-options.tsx)).
 * iOS before 26: text button, bold for confirm.
 */
export const HeaderButton = ({
  kind,
  label,
  onPress,
  disabled,
  testID,
}: HeaderButtonProps) => {
  const colors = useColors();

  if (!HAS_FLOATING_HEADER) {
    return (
      <LinkButton
        onPress={onPress}
        type="primary"
        disabled={disabled}
        testID={testID}
        style={kind === "cancel" ? undefined : { fontWeight: "600" }}
      >
        {label}
      </LinkButton>
    );
  }

  const isProminent = kind !== "cancel";
  return (
    <Host matchContents style={{ minWidth: SIZE, minHeight: SIZE }}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle(isProminent ? "glassProminent" : "glass"),
          buttonOutline("circle"),
          controlSize("regular"),
          ...(isProminent ? [tint(colors.primaryButtonBackground)] : []),
          accessibilityLabel(label),
          ...(testID ? [accessibilityIdentifier(testID)] : []),
          disabledModifier(Boolean(disabled)),
        ]}
      >
        <Image
          systemName={SYMBOLS[kind]}
          modifiers={[
            // Matches native bar symbols in size and weight.
            font({ size: GLYPH_SIZE, weight: "regular" }),
            // Disabled: system gray glyph, else white on gray hides it.
            ...(isProminent && !disabled
              ? [foregroundStyle(colors.primaryButtonText)]
              : []),
            frame({ width: LABEL_SIZE, height: LABEL_SIZE }),
          ]}
        />
      </Button>
    </Host>
  );
};
