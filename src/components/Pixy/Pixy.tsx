import { useId } from "react";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import {
  PIXY_CHEEK,
  PIXY_EYE_R,
  PIXY_EYE_Y,
  PIXY_EYES_X,
  PIXY_INK,
} from "./constants";
import { PixyBackground, PixyDefs } from "./face";
import type { PixyTone } from "./constants";

const Eye = ({ cx, tone }: { cx: number; tone: PixyTone }) => {
  // Hard day: calm closed eyes. Pixy comforts, it never mirrors the mood.
  if (tone === "bad") {
    return (
      <Path
        d={`M${cx - PIXY_EYE_R * 0.7} ${PIXY_EYE_Y} Q${cx} ${PIXY_EYE_Y + PIXY_EYE_R * 0.65} ${cx + PIXY_EYE_R * 0.7} ${PIXY_EYE_Y}`}
        stroke="#fff"
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  const pupilY = tone === "good" ? PIXY_EYE_Y - 1 : PIXY_EYE_Y + 0.7;
  const pupilR = PIXY_EYE_R * 0.44;
  return (
    <G>
      <Circle cx={cx} cy={PIXY_EYE_Y} r={PIXY_EYE_R} fill="#fff" />
      <Circle cx={cx} cy={pupilY} r={pupilR} fill={PIXY_INK} />
      <Circle
        cx={cx - pupilR * 0.35}
        cy={pupilY - pupilR * 0.4}
        r={pupilR * 0.32}
        fill="#fff"
      />
    </G>
  );
};

const MOUTHS: Record<PixyTone, string> = {
  good: "M40 64 Q50 75 60 64",
  neutral: "M43.5 67 L56.5 67",
  // Small, warm smile.
  bad: "M45 66 Q50 70.5 55 66",
};

/**
 * Pixy, the app's mascot, drawn on the Tangerine app icon: squircle,
 * tangerine gradient, eyes on the icon's dot grid. `tone` only changes the
 * face; the color stays the brand color. For an animated Pixy use
 * `PixyMascot`.
 */
export const Pixy = ({ size, tone }: { size: number; tone: PixyTone }) => {
  const id = useId().replaceAll(":", "");

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <PixyDefs id={id} />
      <G clipPath={`url(#${id}clip)`}>
        <PixyBackground id={id} />
        {PIXY_EYES_X.map((cx) => (
          <Eye key={cx} cx={cx} tone={tone} />
        ))}
        {tone !== "neutral" &&
          [19, 81].map((cx) => (
            <Ellipse
              key={cx}
              cx={cx}
              cy={61}
              rx={6.5}
              ry={3.6}
              fill={PIXY_CHEEK}
              opacity={0.55}
            />
          ))}
        <Path
          d={MOUTHS[tone]}
          stroke={PIXY_INK}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
      </G>
    </Svg>
  );
};
