import { useId } from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeComposite,
  FeFlood,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  FeOffset,
  Filter,
  G,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

/** Box size. The cloud fills about 70 points; the rest holds its shadow. */
export const CLOUD_PIXY_SIZE = 84;
/** Leaves room around the cloud, mostly below, for the shadow blur. */
const VIEW_BOX = "-6 -4 112 112";
/** Shadow tint: sky blue, darker. A black shadow looks dirty on the sky. */
const SHADOW = "#1d4f8a";
const INK = "#1c2740";
const EYE_Y = 54;
const EYE_RX = 7;
const EYE_RY = 9.6;
const EYES_X = [40.5, 59.5];
/** Puffs sit in a ring around the body, like petals. */
const PUFFS = Array.from({ length: 7 }, (_, index) => {
  const angle = ((-90 + (index * 360) / 7) * Math.PI) / 180;
  return { cx: 50 + Math.cos(angle) * 24, cy: 52 + Math.sin(angle) * 22 };
});
/** Four-point sparkle, centered on `x`, `y`. */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;

const Eye = ({
  cx,
  isBlinking,
  isHappy,
}: {
  cx: number;
  isBlinking: boolean;
  isHappy: boolean;
}) => {
  // Happy: closed upward arcs, like anime "^^" eyes.
  if (isHappy) {
    return (
      <Path
        d={`M${cx - EYE_RX} ${EYE_Y + 3} Q${cx} ${EYE_Y - 7} ${cx + EYE_RX} ${EYE_Y + 3}`}
        stroke={INK}
        strokeWidth={2.8}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  if (isBlinking) {
    return (
      <Path
        d={`M${cx - EYE_RX} ${EYE_Y + 1} Q${cx} ${EYE_Y + 4} ${cx + EYE_RX} ${EYE_Y + 1}`}
        stroke={INK}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <G>
      <Ellipse cx={cx} cy={EYE_Y} rx={EYE_RX} ry={EYE_RY} fill={INK} />
      <Path d={sparkle(cx - 1.5, EYE_Y - 3.6, 3.8)} fill="#fff" />
      <Circle cx={cx + 2.4} cy={EYE_Y + 4} r={1.2} fill="#fff" />
    </G>
  );
};

/**
 * Cloud Pixy: a bright white puff with sparkling eyes, or happy "^^" eyes. Two shadows follow
 * the cloud outline, a tight one close under it and a wide soft one, so it
 * floats in front of the sky. Flies in light and dark mode, only in free sky
 * (`SkyFlightZone`): never over text, controls, or screenshots. Hidden with
 * reduced motion.
 */
export const CloudPixy = ({
  isBlinking,
  isHappy = false,
}: {
  isBlinking: boolean;
  /** Happy "^^" eyes. Wins over a blink. */
  isHappy?: boolean;
}) => {
  const id = useId().replaceAll(":", "");
  const fill = `url(#${id}body)`;

  return (
    <Svg width={CLOUD_PIXY_SIZE} height={CLOUD_PIXY_SIZE} viewBox={VIEW_BOX}>
      <Defs>
        <LinearGradient
          id={`${id}body`}
          x1="0"
          y1="14"
          x2="0"
          y2="88"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor="#ffffff" />
          <Stop offset={0.6} stopColor="#fbfdff" />
          <Stop offset={1} stopColor="#dde9f7" />
        </LinearGradient>
        <Filter
          id={`${id}shadow`}
          x="-6"
          y="-4"
          width="112"
          height="112"
          filterUnits="userSpaceOnUse"
        >
          <FeGaussianBlur in="SourceAlpha" stdDeviation={1.2} result="near" />
          <FeOffset in="near" dy={1.5} result="nearOffset" />
          <FeFlood floodColor={SHADOW} floodOpacity={0.22} result="nearTint" />
          <FeComposite
            in="nearTint"
            in2="nearOffset"
            operator="in"
            result="nearShadow"
          />
          <FeGaussianBlur in="SourceAlpha" stdDeviation={4.5} result="far" />
          <FeOffset in="far" dy={6} result="farOffset" />
          <FeFlood floodColor={SHADOW} floodOpacity={0.16} result="farTint" />
          <FeComposite
            in="farTint"
            in2="farOffset"
            operator="in"
            result="farShadow"
          />
          <FeMerge>
            <FeMergeNode in="farShadow" />
            <FeMergeNode in="nearShadow" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>
      <G filter={`url(#${id}shadow)`}>
        <Circle cx={50} cy={52} r={28} fill={fill} />
        {PUFFS.map(({ cx, cy }) => (
          <Circle key={cx} cx={cx} cy={cy} r={15} fill={fill} />
        ))}
      </G>
      {EYES_X.map((cx) => (
        <Eye key={cx} cx={cx} isBlinking={isBlinking} isHappy={isHappy} />
      ))}
    </Svg>
  );
};
