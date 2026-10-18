/** One action of the "Edit Photo" menu. */
export interface PhotoAction {
  label: string;
  testID: string;
  onPress: () => void;
  /** Red text: the action drops the photo. */
  destructive?: boolean;
}

/**
 * Props shared by the platform `PhotoButton` files. Without a photo the
 * button opens the library at once; with a photo it opens a menu of
 * `actions`.
 */
export interface PhotoButtonProps {
  hasPhoto: boolean;
  addLabel: string;
  editLabel: string;
  testID: string;
  onAdd: () => void;
  actions: PhotoAction[];
}
