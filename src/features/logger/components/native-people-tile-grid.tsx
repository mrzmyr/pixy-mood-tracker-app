import { useRef, useState } from "react";
import type { ComponentType } from "react";
import { ScrollView, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import type { Person } from "@/features/people";
import type { NativePeopleTileProps } from "./native-people-tile";
import type { PeopleTileGridProps } from "./people-tile-grid-props";

const CELL_TRANSITION = LinearTransition.duration(200);

/** `ids` with `sourceId` moved to the spot of `targetId`. */
const moveId = (ids: string[], sourceId: string, targetId: string) => {
  const targetIndex = ids.indexOf(targetId);
  if (targetIndex === -1 || !ids.includes(sourceId)) {
    return ids;
  }
  const rest = ids.filter((id) => id !== sourceId);
  return [...rest.slice(0, targetIndex), sourceId, ...rest.slice(targetIndex)];
};

/** Tile from `renderTile`; each new touch calls `onTouchStart`. */
const TileContent = ({
  person,
  renderTile,
  isPressBlocked,
  onTouchStart,
}: {
  person: Person;
  renderTile: PeopleTileGridProps["renderTile"];
  isPressBlocked: () => boolean;
  onTouchStart: () => void;
}) => (
  <View onTouchStart={onTouchStart}>{renderTile(person, isPressBlocked)}</View>
);

/**
 * Grid of person tiles wrapped in the native iOS tile: hold shows the
 * system context menu, moving the finger turns it into a drag. Tiles make
 * room while the drag passes over them; the drop saves the order.
 */
export const NativePeopleTileGrid = ({
  NativeTile,
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
}: PeopleTileGridProps & {
  NativeTile: ComponentType<NativePeopleTileProps>;
}) => {
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOrderRef = useRef<string[] | null>(null);
  // True from menu or drag start until the next touch starts: the touch
  // that opens either can also end as a press.
  const pressBlocked = useRef(false);

  const peopleIds = people.map((person) => person.id);
  const byId = new Map(people.map((person) => [person.id, person]));
  const ordered = (dragOrder ?? peopleIds).flatMap((id) => {
    const person = byId.get(id);
    return person ? [person] : [];
  });

  const updateDragOrder = (next: string[] | null) => {
    dragOrderRef.current = next;
    setDragOrder(next);
  };

  const endDrag = () => {
    const finalOrder = dragOrderRef.current;
    if (finalOrder && finalOrder.join(",") !== peopleIds.join(",")) {
      onReorder(finalOrder);
    }
    dragOrderRef.current = null;
    setDragOrder(null);
    setDraggingId(null);
  };

  const cellStyle = {
    width: `${100 / columns}%` as const,
    paddingHorizontal: columnGap / 2,
    alignItems: "center" as const,
  };

  const renderPerson = (person: Person) => (
    <Animated.View key={person.id} style={cellStyle} layout={CELL_TRANSITION}>
      <NativeTile
        tileId={person.id}
        menuTitle={person.name}
        actions={menuActions(person)}
        style={{ opacity: draggingId === person.id ? 0 : 1 }}
        onMenuAction={({ nativeEvent }) => onMenuAction(person, nativeEvent.id)}
        onInteractionStart={({ nativeEvent }) => {
          pressBlocked.current = true;
          if (nativeEvent.dragging) {
            setDraggingId(person.id);
          }
        }}
        onDragEnter={({ nativeEvent }) =>
          updateDragOrder(
            moveId(
              dragOrderRef.current ?? peopleIds,
              nativeEvent.sourceId,
              nativeEvent.targetId
            )
          )
        }
        onDragEnd={endDrag}
      >
        <TileContent
          person={person}
          renderTile={renderTile}
          isPressBlocked={() => pressBlocked.current}
          onTouchStart={() => {
            pressBlocked.current = false;
          }}
        />
      </NativeTile>
    </Animated.View>
  );

  return (
    <ScrollView style={{ flex: 1 }}>
      <View
        style={{
          marginTop: 24,
          marginHorizontal: -columnGap / 2,
          paddingBottom,
          flexDirection: "row",
          flexWrap: "wrap",
          rowGap,
        }}
      >
        {ordered.map(renderPerson)}
        {addTile && (
          <Animated.View style={cellStyle} layout={CELL_TRANSITION}>
            {addTile}
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
};
