import { CloseButton } from "@/components/close-button";
import LinkButton from "@/components/link-button";
import type { HeaderButtonProps } from "./header-button.types";

export type {
  HeaderButtonKind,
  HeaderButtonProps,
} from "./header-button.types";

/**
 * Button of a modal header ([Modal Headers](../../DESIGN.md#modal-headers)).
 * Android and web: close icon for cancel, text for confirm and send, like
 * the Material 3 full-screen dialog. iOS: `header-button.ios.tsx`.
 * Open: Android disables confirm until the form is valid, but M3 says never
 * disable it in full-screen dialogs. Android feedback sends with an icon; M3
 * wants a text button.
 */
export const HeaderButton = ({
  kind,
  label,
  onPress,
  disabled,
  testID,
}: HeaderButtonProps) =>
  kind === "cancel" ? (
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
      style={{ fontWeight: "600" }}
    >
      {label}
    </LinkButton>
  );
