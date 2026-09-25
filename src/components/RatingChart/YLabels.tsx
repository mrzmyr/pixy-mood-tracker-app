import { RATING_KEYS } from "@/constants/Ratings";
import useScale from "@/hooks/useScale";
import { Rect } from "react-native-svg";

/**
 * Rating color swatches on the Y axis of {@link RatingChart}, best at the
 * top.
 */
export const YLabels = ({ relativeY, YLegendWidth, rowHeight }) => {
  const scale = useScale();

  return (
    <>
      {[...RATING_KEYS].reverse().map((rating, index) => {
        const y = relativeY(index);
        return (
          <Rect
            key={`ylabel-${rating}`}
            x={(YLegendWidth - 20) / 2}
            y={y + rowHeight / 2 / 2}
            width={20}
            height={rowHeight / 2}
            fill={scale.colors[rating].background}
            rx={4}
          />
        );
      })}
    </>
  );
};
