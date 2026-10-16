import type { ReactElement } from "react";
import type { ViewStyle } from "react-native";

/** Actions of the long-press menu on a tag or person. */
export interface ItemMenuActions {
  onEdit: () => void;
  /** Missing for archived items: they have nothing to archive. */
  onArchive?: () => void;
  /** Archive label of the item kind, for example "Archive". */
  archiveLabel: string;
  /** Asks to confirm before anything is deleted. */
  onDelete: () => void;
}

/** Wraps exactly one item; margins go on `style`, outside the native host. */
export interface ItemMenuProps {
  menu: ItemMenuActions;
  style?: ViewStyle;
  children: ReactElement;
}
