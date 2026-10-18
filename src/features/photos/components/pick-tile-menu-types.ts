import type { ReactElement } from "react";

/** Shared by the iOS menu and the plain fallback, so `PickTile` passes the same props on every platform. */
export interface PickTileMenuProps {
  /** Photo to preview. Stored file, picked file, or library asset (`ph://`). */
  uri: string;
  recyclingKey: string;
  size: number;
  isChecked: boolean;
  onToggle: () => void;
  onOpen: () => void;
  /** The tile. */
  children: ReactElement;
}
