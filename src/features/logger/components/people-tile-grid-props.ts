import type { ReactElement } from "react";
import type {
  Person,
  PersonMenuAction,
  PersonMenuActionId,
} from "@/features/people";

/** Props shared by the native and the sortable people grid. */
export interface PeopleTileGridProps {
  people: Person[];
  /**
   * Tile presses must check `isPressBlocked`: the touch that ends a drag or
   * opens a menu can also end as a press.
   */
  renderTile: (person: Person, isPressBlocked: () => boolean) => ReactElement;
  addTile: ReactElement | null;
  columns: number;
  columnGap: number;
  rowGap: number;
  paddingBottom: number;
  onReorder: (orderedIds: Person["id"][]) => void;
  menuActions: (person: Person) => PersonMenuAction[];
  onMenuAction: (person: Person, actionId: PersonMenuActionId) => void;
}
