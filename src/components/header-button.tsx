import { CloseButton } from "@/components/close-button";
import LinkButton from "@/components/link-button";
import type { HeaderButtonProps } from "./header-button.types";

export type {
  HeaderButtonKind,
  HeaderButtonProps,
} from "./header-button.types";

/**
 * Button of a modal header ([Modal Headers](../../DESIGN.md#modal-headers)).
 * Android and web: icon for cancel and back, text for confirm and send, like
 * the Material 3 full-screen dialog. iOS: `header-button.ios.tsx`.
 */
export const HeaderButton = ({
  kind,
  label,
  onPress,
  disabled,
  testID,
}: HeaderButtonProps) =>
  kind === "cancel" || kind === "back" ? (
    <CloseButton
      icon={kind === "back" ? "back" : "close"}
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
      style={{ fontWeight: "600" }}
    >
      {label}
    </LinkButton>
  );
