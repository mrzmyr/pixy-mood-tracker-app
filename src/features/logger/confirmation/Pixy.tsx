import { useId } from "react";
import { useReducedMotion } from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import type { MoodTone } from "./daySummary";
import { usePixyIdle } from "./usePixyIdle";
import type { PixyIdle } from "./usePixyIdle";

const INK = "#3b1606";
const CHEEK = "#ff8fa3";

// Eyes sit on the top row of the app icon's 2x2 dot grid.
const EYE_Y = 38;
const EYE_R = 13;
const EYES_X = [33.5, 66.5];
// Pupils shift this far on a glance; they stay inside the eye.
const GLANCE_X = EYE_R * 0.36;

const Eye = ({
  cx,
  tone,
  isJoyful,
  idle,
}: {
  cx: number;
  tone: MoodTone;
  isJoyful: boolean;
  idle: PixyIdle;
}) => {
  // Joy: squeezed happy eyes, arcs bent up.
  if (isJoyful) {
    return (
      <Path
        d={`M${cx - EYE_R * 0.75} ${EYE_Y + EYE_R * 0.3} Q${cx} ${EYE_Y - EYE_R * 0.9} ${cx + EYE_R * 0.75} ${EYE_Y + EYE_R * 0.3}`}
        stroke="#fff"
        strokeWidth={6.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    );
  }

  // Hard day: calm closed eyes. Pixy comforts, it never mirrors the mood.
  if (tone === "bad") {
    return (
      <Path
        d={`M${cx - EYE_R * 0.7} ${EYE_Y} Q${cx} ${EYE_Y + EYE_R * 0.65} ${cx + EYE_R * 0.7} ${EYE_Y}`}
        stroke="#fff"
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  // Blink: the eye closes to a flat line.
  if (idle.isBlinking) {
    return (
      <Path
        d={`M${cx - EYE_R * 0.75} ${EYE_Y} L${cx + EYE_R * 0.75} ${EYE_Y}`}
        stroke="#fff"
        strokeWidth={6.5}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  const pupilX =
    cx + { center: 0, left: -GLANCE_X, right: GLANCE_X }[idle.look];
  const pupilY = tone === "good" ? EYE_Y - 1 : EYE_Y + 0.7;
  const pupilR = EYE_R * 0.44;
  return (
    <G>
      <Circle cx={cx} cy={EYE_Y} r={EYE_R} fill="#fff" />
      <Circle cx={pupilX} cy={pupilY} r={pupilR} fill={INK} />
      <Circle
        cx={pupilX - pupilR * 0.35}
        cy={pupilY - pupilR * 0.4}
        r={pupilR * 0.32}
        fill="#fff"
      />
    </G>
  );
};

const MOUTHS: Record<MoodTone, string> = {
  good: "M40 64 Q50 75 60 64",
  neutral: "M43.5 67 L56.5 67",
  // Small, warm smile.
  bad: "M45 66 Q50 70.5 55 66",
};

// Joy: wide open laugh with a tongue.
const JOY_MOUTH = "M37 60 Q50 60 63 60 Q62 80 50 80 Q38 80 37 60 Z";
const JOY_TONGUE =
  "M42.5 73.5 Q50 67 57.5 73.5 Q54.5 80 50 80 Q45.5 80 42.5 73.5 Z";

/**
 * Pixy, the app's mascot, drawn on the Tangerine app icon: squircle,
 * tangerine gradient, eyes on the icon's dot grid. `tone` only changes the
 * face; the color stays the brand color. `isJoyful` overrides the face
 * with a laugh while Pixy celebrates a tap.
 *
 * `isIdle` lets Pixy blink and glance around (`usePixyIdle`). Only open eyes
 * do this: never on hard days, where Pixy keeps its calm closed eyes, and
 * never while it laughs.
 */
export const Pixy = ({
  size,
  tone,
  isJoyful = false,
  isIdle = false,
}: {
  size: number;
  tone: MoodTone;
  isJoyful?: boolean;
  isIdle?: boolean;
}) => {
  const id = useId().replaceAll(":", "");
  const idle = usePixyIdle({
    isEnabled: isIdle && tone !== "bad" && !isJoyful,
    isReducedMotion: useReducedMotion(),
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={`${id}clip`}>
          <Rect width={100} height={100} rx={24} />
        </ClipPath>
        <RadialGradient id={`${id}a`} cx="25%" cy="25%" r="60%">
          <Stop offset={0} stopColor="#FFC23D" />
          <Stop offset={1} stopColor="#FFC23D" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}b`} cx="80%" cy="72%" r="70%">
          <Stop offset={0} stopColor="#FF4D00" />
          <Stop offset={1} stopColor="#FF4D00" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}c`} cx="65%" cy="15%" r="40%">
          <Stop offset={0} stopColor="#FFE08A" stopOpacity={0.7} />
          <Stop offset={1} stopColor="#FFE08A" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <G clipPath={`url(#${id}clip)`}>
        <Rect width={100} height={100} fill="#FB6B0F" />
        <Rect width={100} height={100} fill={`url(#${id}a)`} />
        <Rect width={100} height={100} fill={`url(#${id}b)`} />
        <Rect width={100} height={100} fill={`url(#${id}c)`} />
        {EYES_X.map((cx) => (
          <Eye key={cx} cx={cx} tone={tone} isJoyful={isJoyful} idle={idle} />
        ))}
        {(isJoyful || tone !== "neutral") &&
          [19, 81].map((cx) => (
            <Ellipse
              key={cx}
              cx={cx}
              cy={61}
              rx={6.5}
              ry={3.6}
              fill={CHEEK}
              opacity={isJoyful ? 0.85 : 0.55}
            />
          ))}
        {isJoyful ? (
          <G>
            <Path d={JOY_MOUTH} fill={INK} />
            <Path d={JOY_TONGUE} fill={CHEEK} />
          </G>
        ) : (
          <Path
            d={MOUTHS[tone]}
            stroke={INK}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </G>
    </Svg>
  );
};
