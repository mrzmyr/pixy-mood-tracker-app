import { View } from "react-native";
import type { IScale } from "@/constants/colors/scales";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import { HOME_LAYOUT } from "../layout";

/** State of a day without a rating: missed (past) or upcoming (future). */
export type MoodUnderlineEmpty = "missed" | "upcoming";

/**
 * Short bar under a weekday in the border color of the day's average
 * rating. The border tone keeps pale ratings (neutral, bad) visible on
 * white. A missed day shows a gray bar, an upcoming day an invisible
 * spacer, so rows keep their height. Decorative: the parent carries the
 * label.
 */
export const MoodUnderline = ({
  rating,
  scale,
  empty = "missed",
}: {
  rating: LogItem["rating"] | null;
  scale: IScale;
  /** Look without a rating. */
  empty?: MoodUnderlineEmpty;
}) => {
  const colors = useColors();
  const mood = rating ? scale[rating] : null;
  const emptyColor = empty === "missed" ? colors.homeDivider : "transparent";

  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={{
        width: HOME_LAYOUT.dayBarWidth,
        height: HOME_LAYOUT.dayBarHeight,
        borderRadius: HOME_LAYOUT.dayBarHeight / 2,
        backgroundColor: mood?.border ?? emptyColor,
      }}
    />
  );
};
