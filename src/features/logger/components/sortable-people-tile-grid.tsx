import { useRef } from "react";
import { ActionSheetIOS, Platform, View } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable from "react-native-sortables";
import type {
  SortableGridDragEndParams,
  SortableGridRenderItemInfo,
} from "react-native-sortables";
import type { Person } from "@/features/people";
import { t } from "@/lib/translation";
import type { PeopleTileGridProps } from "./people-tile-grid-props";

type Cell = { type: "person"; person: Person } | { type: "add" };

/**
 * Menu for a tile released without moving. iOS: action sheet with the menu
 * rows. Elsewhere the first row runs.
 */
const showMenu = (
  person: Person,
  {
    menuActions,
    onMenuAction,
  }: Pick<PeopleTileGridProps, "menuActions" | "onMenuAction">
) => {
  const actions = menuActions(person);
  if (Platform.OS !== "ios") {
    if (actions[0]) {
      onMenuAction(person, actions[0].id);
    }
    return;
  }
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: person.name,
      options: [...actions.map((action) => action.title), t("cancel")],
      destructiveButtonIndex: actions.findIndex((action) => action.destructive),
      cancelButtonIndex: actions.length,
    },
    (index) => {
      const action = actions[index];
      if (action) {
        onMenuAction(person, action.id);
      }
    }
  );
};

/**
 * Scrolling grid of person tiles, drawn with `react-native-sortables`. Hold
 * a tile to lift it, move it to reorder. Released without a new order, it
 * shows the menu. `addTile` stays the last cell and never moves.
 */
export const SortablePeopleTileGrid = ({
  people,
  renderTile,
  addTile,
  columns,
  columnGap,
  rowGap,
  paddingBottom,
  onReorder,
  menuActions,
  onMenuAction,
}: PeopleTileGridProps) => {
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
      showMenu(person, { menuActions, onMenuAction });
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
