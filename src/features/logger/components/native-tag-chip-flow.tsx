import { useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { CHIP, CHIP_FLOW } from "@/constants/chip";
import type { Tag, TagMenuActionId } from "@/features/tags";
import type { NativePeopleTileProps } from "./native-people-tile";
import type { TagChipFlowProps } from "./tag-chip-flow-props";
import { moveId } from "./tile-reorder";
import { TagChipContent } from "./tag-chip-content";

/**
 * Wrapping tag chips, each in the native iOS tile: hold shows the system
 * context menu, moving the finger turns it into a drag. Chips make room
 * while the drag passes over them; the drop saves the order. A drag only
 * reorders inside this flow.
 */
export const NativeTagChipFlow = ({
  NativeTile,
  tags,
  renderTag,
  trailing,
  onReorder,
  onDragChange,
  menuActions,
  onMenuAction,
}: TagChipFlowProps & {
  NativeTile: ComponentType<NativePeopleTileProps<TagMenuActionId>>;
}) => {
  // Built on first render, not on import: the jest reanimated mock of
  // expo-router/testing-library has no LinearTransition, and screens
  // importing `@/features/logger` load this file.
  const chipTransition = useMemo(() => LinearTransition.duration(200), []);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOrderRef = useRef<string[] | null>(null);
  // True from menu or drag start until the next touch starts: the touch
  // that opens either can also end as a press.
  const pressBlocked = useRef(false);

  const tagIds = tags.map((tag) => tag.id);
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const ordered = (dragOrder ?? tagIds).flatMap((id) => {
    const tag = byId.get(id);
    return tag ? [tag] : [];
  });

  const updateDragOrder = (next: string[] | null) => {
    dragOrderRef.current = next;
    setDragOrder(next);
  };

  const endDrag = () => {
    const finalOrder = dragOrderRef.current;
    if (finalOrder && finalOrder.join(",") !== tagIds.join(",")) {
      onReorder(finalOrder);
    }
    dragOrderRef.current = null;
    setDragOrder(null);
    setDraggingId(null);
    onDragChange?.(false);
  };

  const renderChip = (tag: Tag) => (
    <Animated.View key={tag.id} layout={chipTransition}>
      <NativeTile
        tileId={tag.id}
        actions={menuActions(tag)}
        previewCornerRadius={CHIP.height / 2}
        style={{ opacity: draggingId === tag.id ? 0 : 1 }}
        onMenuAction={({ nativeEvent }) => onMenuAction(tag, nativeEvent.id)}
        onInteractionStart={({ nativeEvent }) => {
          pressBlocked.current = true;
          if (nativeEvent.dragging) {
            setDraggingId(tag.id);
            onDragChange?.(true);
          }
        }}
        onDragEnter={({ nativeEvent }) =>
          updateDragOrder(
            moveId(
              dragOrderRef.current ?? tagIds,
              nativeEvent.sourceId,
              nativeEvent.targetId
            )
          )
        }
        onDragEnd={endDrag}
      >
        <TagChipContent
          tag={tag}
          renderTag={renderTag}
          isPressBlocked={() => pressBlocked.current}
          onTouchStart={() => {
            pressBlocked.current = false;
          }}
        />
      </NativeTile>
    </Animated.View>
  );

  return (
    <View
      style={{
        ...CHIP_FLOW,
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      {ordered.map(renderChip)}
      {trailing && (
        <Animated.View layout={chipTransition}>{trailing}</Animated.View>
      )}
    </View>
  );
};
