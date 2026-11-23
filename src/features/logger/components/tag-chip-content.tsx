import { View } from "react-native";
import type { Tag } from "@/features/tags";
import type { TagChipFlowProps } from "./tag-chip-flow-props";

/** Chip from `renderTag`; each new touch calls `onTouchStart`. */
export const TagChipContent = ({
  tag,
  renderTag,
  isPressBlocked,
  onTouchStart,
}: {
  tag: Tag;
  renderTag: TagChipFlowProps["renderTag"];
  isPressBlocked: () => boolean;
  onTouchStart: () => void;
}) => <View onTouchStart={onTouchStart}>{renderTag(tag, isPressBlocked)}</View>;
