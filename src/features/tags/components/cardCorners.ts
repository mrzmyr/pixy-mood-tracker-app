import { Platform } from "react-native";
import { RADIUS } from "@/constants/Radius";

/**
 * Corners of one row in a sortable grouped list. Rows render one by one, so
 * each row rounds its own edges: iOS grouped lists round the first and last
 * row; Android lists run flat and full width.
 */
export const cardCorners = (isFirst: boolean, isLast: boolean) =>
  Platform.OS === "ios"
    ? {
        borderTopLeftRadius: isFirst ? RADIUS.md : 0,
        borderTopRightRadius: isFirst ? RADIUS.md : 0,
        borderBottomLeftRadius: isLast ? RADIUS.md : 0,
        borderBottomRightRadius: isLast ? RADIUS.md : 0,
      }
    : {};
