import { mix } from "chroma-js";
import Svg, { Ellipse, G, Path, Rect } from "react-native-svg";
import { RATING_MAPPING } from "@/constants/Ratings";
import type { MoodTheme } from "@/constants/MoodThemes";

const INK = "#302C3F";
const MOUTHS = [
  "M23 43 Q32 31 41 43 Q32 37 23 43Z",
  "M25 42 Q32 34 39 42",
  "M27 40 Q32 36 37 40",
  "M28 39 H36",
  "M26 37 Q32 43 38 37",
  "M24 36 Q32 49 40 36Z",
  "M22 35 Q32 55 42 35Z",
];
const PIXEL_MOUTHS = [
  "M22 44V36H26V32H38V36H42V44H38V40H26V44Z",
  "M24 42V36H28V32H36V36H40V42H36V38H28V42Z",
  "M26 40V36H38V40H34V38H30V40Z",
  "M26 36H38V40H26Z",
  "M26 34H30V38H34V34H38V38H34V42H30V38H26Z",
  "M24 34H28V38H36V34H40V42H36V46H28V42H24Z",
  "M22 34H42V42H38V46H26V42H22Z",
];

const Eyes = ({ level }: { level: number }) => {
  if (level === 6) {
    return (
      <Path
        d="M21 29 Q25 21 29 29 M35 29 Q39 21 43 29"
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
      />
    );
  }
  if (level === 0) {
    return (
      <Path
        d="M21 25 L28 29 L21 32 M43 25 L36 29 L43 32"
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
      />
    );
  }
  return (
    <G fill={INK}>
      <Ellipse cx={25} cy={29} rx={2.3} ry={level === 3 ? 1.5 : 3} />
      <Ellipse cx={39} cy={29} rx={2.3} ry={level === 3 ? 1.5 : 3} />
      {level === 1 && (
        <Path
          d="M21 23L28 21 M36 21L43 23"
          stroke={INK}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </G>
  );
};

/** Original vector characters; seven expressions preserve the rating order without color cues. Decorative within labeled controls. */
export const MoodCharacter = ({
  theme,
  rating,
  color,
  size = 40,
}: {
  theme: MoodTheme;
  rating: keyof typeof RATING_MAPPING;
  color: string;
  size?: number | string;
}) => {
  const level = RATING_MAPPING[rating];
  const fill = mix(color, "#ffffff", 0.4).hex();
  if (theme === "classic") {
    return (
      <Svg
        testID={`mood-character-${theme}-${rating}`}
        width={size}
        height={size}
        viewBox="0 0 64 64"
        accessible={false}
      >
        <Rect x={8} y={8} width={48} height={48} rx={8} fill={color} />
      </Svg>
    );
  }
  if (theme === "robots") {
    return (
      <Svg
        testID={`mood-character-${theme}-${rating}`}
        width={size}
        height={size}
        viewBox="0 0 64 64"
        accessible={false}
      >
        <Path d="M30 5H34V14H30Z M26 3H38V8H26Z" fill={INK} />
        <Path
          d="M14 13H50V18H55V47H50V52H14V47H9V18H14Z"
          fill={fill}
          stroke={INK}
          strokeWidth={2.5}
        />
        <Path
          d="M4 25H9V39H4Z M55 25H60V39H55Z M18 52H27V57H18Z M37 52H46V57H37Z"
          fill={INK}
        />
        <Path
          d={
            level === 6
              ? "M19 27V23H23V19H27V23H31V27H27V23H23V27Z M35 27V23H39V19H43V23H47V27H43V23H39V27Z"
              : "M21 23H27V29H21Z M37 23H43V29H37Z"
          }
          fill={INK}
        />
        <Path d={PIXEL_MOUTHS[level]} fill={INK} />
        {level === 0 && (
          <Path d="M20 32H24V41H20Z M40 32H44V41H40Z" fill="#578DC5" />
        )}
        <Rect x={17} y={16} width={12} height={3} fill="white" opacity={0.65} />
      </Svg>
    );
  }
  return (
    <Svg
      testID={`mood-character-${theme}-${rating}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      accessible={false}
    >
      {theme === "cats" ? (
        <G>
          <Path
            d="M10 30L9 9Q18 9 24 18Q32 15 40 18Q46 9 55 9L54 30Q59 53 32 55Q5 53 10 30Z"
            fill={fill}
            stroke={INK}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Path
            d="M14 15L16 26L22 21Z M50 15L48 26L42 21Z"
            fill={INK}
            opacity={0.2}
          />
          <Path
            d="M5 34L15 36 M5 41L15 40 M49 36L59 34 M49 40L59 41"
            stroke={INK}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Path d="M29 32H35L32 35Z" fill={INK} />
        </G>
      ) : (
        <G>
          <Path
            d="M8 39C5 28 13 24 15 17C18 7 30 8 35 12C41 6 52 12 51 22C64 29 57 39 55 44C53 57 39 56 32 53C20 60 7 52 8 39Z"
            fill={fill}
            stroke={INK}
            strokeWidth={2.5}
          />
          <Ellipse cx={19} cy={44} rx={6} ry={3} fill={INK} opacity={0.1} />
          <Ellipse cx={46} cy={44} rx={6} ry={3} fill={INK} opacity={0.1} />
          <Path
            d="M18 20Q20 14 26 16"
            stroke="white"
            opacity={0.7}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      )}
      <Eyes level={level} />
      <Path
        d={MOUTHS[level]}
        fill={level === 0 || level >= 5 ? INK : "none"}
        stroke={INK}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {level === 0 && (
        <Path
          d="M19 34Q13 41 19 43Q25 41 19 34Z M45 34Q39 41 45 43Q51 41 45 34Z"
          fill="#578DC5"
        />
      )}
      {level >= 5 && (
        <Path
          d="M29 43Q32 39 35 43"
          stroke="#ED879C"
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
};
