import { Platform, Pressable } from "react-native";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import Check from "lucide-react-native/icons/check";
import { CloseButton } from "@/components/close-button";
import LinkButton from "@/components/link-button";
import useColors from "@/hooks/use-colors";
import { HAS_FLOATING_HEADER } from "@/constants/floating-header";

/** `cancel` leads. `confirm` saves and `send` sends. Both trail. */
export type HeaderButtonKind = "cancel" | "confirm" | "send";

const SIZE = 44;
const ICON_SIZE = 22;

const CONFIRM_ICONS = { confirm: Check, send: ArrowUp } as const;

/**
 * Button of a modal header ([Modal Headers](../../DESIGN.md#modal-headers)).
 * iOS 26: close icon, or filled confirm circle. Android: close icon, text
 * confirm. iOS before 26: text for both. `label` is the spoken name of icon
 * buttons and the text of text buttons.
 */
export const HeaderButton = ({
  kind,
  label,
  onPress,
  disabled,
  testID,
}: {
  kind: HeaderButtonKind;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) => {
  const colors = useColors();

  if (kind === "cancel") {
    return Platform.OS === "android" || HAS_FLOATING_HEADER ? (
      <CloseButton
        testID={testID}
        onPress={onPress}
        accessibilityLabel={label}
        disabled={disabled}
      />
    ) : (
      <LinkButton
        onPress={onPress}
        type="primary"
        disabled={disabled}
        testID={testID}
      >
        {label}
      </LinkButton>
    );
  }

  if (!HAS_FLOATING_HEADER) {
    return (
      <LinkButton
        onPress={onPress}
        type="primary"
        disabled={disabled}
        testID={testID}
        style={{ fontWeight: "600" }}
      >
        {label}
      </LinkButton>
    );
  }

  const Icon = CONFIRM_ICONS[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: disabled
          ? colors.primaryButtonBackgroundDisabled
          : colors.primaryButtonBackground,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon
        width={ICON_SIZE}
        height={ICON_SIZE}
        color={
          disabled ? colors.primaryButtonTextDisabled : colors.primaryButtonText
        }
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
};
