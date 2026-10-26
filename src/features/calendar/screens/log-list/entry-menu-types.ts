/** Props shared by the platform `EntryMenu` files. Each action closes the menu first. */
export interface EntryMenuProps {
  /** Accessibility label of the "…" trigger. */
  label: string;
  testID: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}
