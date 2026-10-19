import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ComponentType, ReactNode } from "react";
import type { NativeSyntheticEvent, ViewStyle } from "react-native";
import type { PersonMenuAction, PersonMenuActionId } from "@/features/people";

const MODULE_NAME = "PixyMoodTrackerPeopleTile";

/**
 * Props of the native tile. It draws nothing itself: `children` is the
 * tile, `actions` fill the context menu, events carry tile ids.
 */
export interface NativePeopleTileProps {
  tileId: string;
  menuTitle: string;
  actions: PersonMenuAction[];
  style?: ViewStyle;
  children: ReactNode;
  onMenuAction: (
    event: NativeSyntheticEvent<{ id: PersonMenuActionId }>
  ) => void;
  onInteractionStart: (
    event: NativeSyntheticEvent<{ dragging?: boolean }>
  ) => void;
  onDragEnter: (
    event: NativeSyntheticEvent<{ sourceId: string; targetId: string }>
  ) => void;
  onDragEnd: () => void;
}

let tileView: ComponentType<NativePeopleTileProps> | null = null;

/**
 * Native tile wrapper from `modules/pixy-mood-tracker-people-tile`: iOS
 * context menu plus drag. `null` where it is missing: Android, web, Jest,
 * and dev clients built before the module.
 */
export const getNativePeopleTile = () => {
  if (!tileView && requireOptionalNativeModule(MODULE_NAME)) {
    tileView = requireNativeView<NativePeopleTileProps>(MODULE_NAME);
  }
  return tileView;
};
