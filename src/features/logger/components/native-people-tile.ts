import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ComponentType, ReactNode } from "react";
import type { NativeSyntheticEvent, ViewStyle } from "react-native";

const MODULE_NAME = "PixyMoodTrackerPeopleTile";

/** One context menu row. `systemImage` is an SF Symbol name. */
export interface NativeTileMenuAction<Id extends string = string> {
  id: Id;
  title: string;
  systemImage: string;
  destructive: boolean;
}

/**
 * Props of the native tile. It draws nothing itself: `children` is the
 * tile, `actions` fill the context menu, events carry tile ids. The menu
 * has no title: the long-pressed tile already shows what it is for.
 */
export interface NativePeopleTileProps<Id extends string = string> {
  tileId: string;
  actions: NativeTileMenuAction<Id>[];
  /**
   * Pill tiles like tag chips: lift preview is the whole tile with this
   * corner radius. Unset: preview traces the avatar circle and the name.
   */
  previewCornerRadius?: number;
  style?: ViewStyle;
  children: ReactNode;
  onMenuAction: (event: NativeSyntheticEvent<{ id: Id }>) => void;
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
 * context menu plus drag, for person tiles and tag chips. `null` where it
 * is missing: Android, web, Jest, and dev clients built before the module.
 */
export const getNativePeopleTile = <Id extends string>() => {
  if (!tileView && requireOptionalNativeModule(MODULE_NAME)) {
    tileView = requireNativeView<NativePeopleTileProps>(MODULE_NAME);
  }
  // SAFETY: the native view sends back only ids from the `actions` it got,
  // so `onMenuAction` sees `Id` values.
  return tileView as ComponentType<NativePeopleTileProps<Id>> | null;
};
