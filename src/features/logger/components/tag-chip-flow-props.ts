import type { ReactElement } from "react";
import type { Tag, TagMenuAction, TagMenuActionId } from "@/features/tags";

/** Props shared by the native and the sortable tag chip flow. */
export interface TagChipFlowProps {
  tags: Tag[];
  /**
   * Chip presses must check `isPressBlocked`: the touch that ends a drag or
   * opens a menu can also end as a press.
   */
  renderTag: (tag: Tag, isPressBlocked: () => boolean) => ReactElement;
  /** Last chip, like "Edit tags". Never moves. */
  trailing: ReactElement | null;
  /** Visible tag ids in their new order. */
  onReorder: (orderedIds: Tag["id"][]) => void;
  menuActions: (tag: Tag) => TagMenuAction[];
  onMenuAction: (tag: Tag, actionId: TagMenuActionId) => void;
}
