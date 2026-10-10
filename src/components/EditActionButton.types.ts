/** Individual confirmation or dismissal action for an edit form. */
export interface EditActionButtonProps {
  /** Save uses a checkmark; cancel uses an xmark. */
  action: "save" | "cancel";
  /** Localized action name retained for screen readers. */
  label: string;
  /** Called when the action is activated. */
  onPress: () => void;
  /** Stable identifier for UI automation. */
  testID?: string;
}
