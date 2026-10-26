/** `cancel` leads. `confirm` saves and `send` sends. Both trail. */
export type HeaderButtonKind = "cancel" | "confirm" | "send";

/** Props of `HeaderButton`, same on every platform. */
export interface HeaderButtonProps {
  kind: HeaderButtonKind;
  /** Spoken name of icon buttons, text of text buttons. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}
