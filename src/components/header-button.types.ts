/**
 * `cancel` leads, always. `confirm` saves or finishes, `send` sends. Both
 * trail, one per header. A screen with nothing to confirm shows `cancel` only.
 */
export type HeaderButtonKind = "cancel" | "confirm" | "send";

/** Props of `HeaderButton`, same on every platform. */
export interface HeaderButtonProps {
  kind: HeaderButtonKind;
  /**
   * Spoken name of icon buttons, text of text buttons. Names the action:
   * "Save", "Send", "Add", never "Done" or "OK". Cancel: "Cancel" when closing
   * drops edits, "Close" when nothing is lost.
   */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** `<feature>-cancel`, `<feature>-save`, `<feature>-close`. */
  testID?: string;
}
