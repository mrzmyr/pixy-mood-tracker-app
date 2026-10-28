import type { EmotionContextMenuProps } from "./emotion-context-menu-types";

/** No long-press menu outside iOS. The button shows as is. */
export const EmotionContextMenu = ({ children }: EmotionContextMenuProps) =>
  children;
