import { useRef } from "react";
import Sortable from "react-native-sortables";
import type { SortableFlexDragEndParams } from "react-native-sortables";
import { CHIP_FLOW, CHIP_GAP } from "@/constants/chip";
import type { TagChipFlowProps } from "./tag-chip-flow-props";
import { TagChipContent } from "./tag-chip-content";
import { showTileMenu } from "./tile-reorder";

const TRAILING_KEY = "trailing";

/**
 * Wrapping tag chips drawn with `react-native-sortables`. Hold a chip to
 * lift it, move it to reorder. Released without a new order, it shows the
 * menu. `trailing` stays the last chip and never moves.
 */
export const SortableTagChipFlow = ({
  tags,
  renderTag,
  trailing,
  onReorder,
  onDragChange,
  menuActions,
  onMenuAction,
}: TagChipFlowProps) => {
  // True from drag start or drop until the next touch starts: the touch
  // that ends a drag also ends as a press. Drag start can arrive late, even
  // after the drop, so the drop sets it too.
  const isDragging = useRef(false);
  const isPressBlocked = () => isDragging.current;

  const onDragEnd = ({
    key,
    fromIndex,
    toIndex,
    indexToKey,
  }: SortableFlexDragEndParams) => {
    isDragging.current = true;
    onDragChange?.(false);
    if (fromIndex !== toIndex) {
      onReorder(indexToKey.filter((itemKey) => itemKey !== TRAILING_KEY));
      return;
    }
    const tag = tags.find((item) => item.id === key);
    if (tag) {
      showTileMenu(tag.title, menuActions(tag), (actionId) =>
        onMenuAction(tag, actionId)
      );
    }
  };

  return (
    <Sortable.Flex
      flexDirection="row"
      flexWrap="wrap"
      alignItems="flex-start"
      justifyContent="flex-start"
      gap={CHIP_GAP}
      paddingRight={CHIP_FLOW.paddingRight}
      paddingBottom={CHIP_FLOW.paddingBottom}
      onDragStart={() => {
        isDragging.current = true;
        onDragChange?.(true);
      }}
      onDragEnd={onDragEnd}
      customHandle
      hapticsEnabled
      activeItemScale={1.08}
    >
      {tags.map((tag) => (
        <Sortable.Handle key={tag.id}>
          <TagChipContent
            tag={tag}
            renderTag={renderTag}
            isPressBlocked={isPressBlocked}
            onTouchStart={() => {
              isDragging.current = false;
            }}
          />
        </Sortable.Handle>
      ))}
      {trailing && (
        <Sortable.Handle key={TRAILING_KEY} mode="fixed-order">
          {trailing}
        </Sortable.Handle>
      )}
    </Sortable.Flex>
  );
};
