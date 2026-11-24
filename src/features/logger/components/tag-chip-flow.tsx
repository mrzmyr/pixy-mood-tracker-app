import { Platform } from "react-native";
import type { TagMenuActionId } from "@/features/tags";
import { getNativePeopleTile } from "./native-people-tile";
import { NativeTagChipFlow } from "./native-tag-chip-flow";
import { SortableTagChipFlow } from "./sortable-tag-chip-flow";
import type { TagChipFlowProps } from "./tag-chip-flow-props";

/**
 * Wrapping tag chips you can reorder and open a menu on, like the people
 * grid. iOS with the native tile module: system context menu that turns
 * into a drag. Elsewhere: sortable flex, release without moving shows the
 * menu.
 */
export const TagChipFlow = (props: TagChipFlowProps) => {
  const NativeTile =
    Platform.OS === "ios" ? getNativePeopleTile<TagMenuActionId>() : null;
  if (NativeTile) {
    return <NativeTagChipFlow NativeTile={NativeTile} {...props} />;
  }
  return <SortableTagChipFlow {...props} />;
};
