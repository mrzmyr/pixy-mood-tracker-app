import { useRef } from "react";
import type { ReactElement } from "react";
import { View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";
import type {
  SortableGridDragEndParams,
  SortableGridRenderItemInfo,
} from "react-native-sortables";
import type { Person } from "@/features/people";

type Cell = { type: "person"; person: Person } | { type: "add" };

/**
 * Scrolling grid of person tiles. Hold a tile to lift it, move it to
 * reorder. Released without a new order, it calls `onRelease`. `addTile`
 * stays the last cell and never moves.
 *
 * `renderTile` gets `isPressBlocked`: tile presses must check it, because
 * the touch that ends a drag also ends as a press.
 */
export const PeopleTileGrid = ({
  people,
  renderTile,
  addTile,
  columns,
  columnGap,
  rowGap,
  paddingBottom,
  onReorder,
  onRelease,
}: {
  people: Person[];
  renderTile: (person: Person, isPressBlocked: () => boolean) => ReactElement;
  addTile: ReactElement | null;
  columns: number;
  columnGap: number;
  rowGap: number;
  paddingBottom: number;
  onReorder: (orderedIds: Person["id"][]) => void;
  onRelease: (person: Person) => void;
}) => {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // True from drag start or drop until the next touch starts: the touch
  // that ends a drag also ends as a press. Drag start can arrive late, even
  // after the drop, so the drop sets it too.
  const isDragging = useRef(false);
  const cells: Cell[] = [
    ...people.map((person) => ({ type: "person" as const, person })),
    ...(addTile ? [{ type: "add" as const }] : []),
  ];

  const isPressBlocked = () => isDragging.current;

  const onDragEnd = ({
    data,
    key,
    fromIndex,
    toIndex,
  }: SortableGridDragEndParams<Cell>) => {
    isDragging.current = true;
    if (fromIndex !== toIndex) {
      onReorder(
        data.flatMap((cell) => (cell.type === "person" ? [cell.person.id] : []))
      );
      return;
    }
    const person = people.find((item) => item.id === key);
    if (person) {
      onRelease(person);
    }
  };

  const renderItem = ({ item }: SortableGridRenderItemInfo<Cell>) =>
    item.type === "person" ? (
      <Sortable.Handle>
        <View
          onTouchStart={() => {
            isDragging.current = false;
          }}
          style={{ alignItems: "center" }}
        >
          {renderTile(item.person, isPressBlocked)}
        </View>
      </Sortable.Handle>
    ) : (
      <Sortable.Handle mode="fixed-order">
        <View style={{ alignItems: "center" }}>{addTile}</View>
      </Sortable.Handle>
    );

  return (
    <Animated.ScrollView ref={scrollRef} style={{ flex: 1 }}>
      <View style={{ marginTop: 24, paddingBottom }}>
        <Sortable.Grid
          columns={columns}
          columnGap={columnGap}
          rowGap={rowGap}
          data={cells}
          keyExtractor={(cell) =>
            cell.type === "person" ? cell.person.id : "add"
          }
          renderItem={renderItem}
          onDragStart={() => {
            isDragging.current = true;
          }}
          onDragEnd={onDragEnd}
          customHandle
          hapticsEnabled
          activeItemScale={1.08}
          scrollableRef={scrollRef}
        />
      </View>
    </Animated.ScrollView>
  );
};
