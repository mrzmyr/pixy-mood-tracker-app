import { Circle, G, Polygon, Svg } from "react-native-svg";

// Variant 10 "Wide" from the app icon explorer, in an 80-unit box.
const RAYS = 12;
const BAR_WIDTH = 9.4;
const BAR_LENGTH = 39.6;
const HOLE_RADIUS = 16.3;
const FIRST_ANGLE = 15;
// Outer bar corners touch this radius, so the logo fills its box.
const OUTER_RADIUS = Math.hypot(BAR_LENGTH, BAR_WIDTH);

const BAR_POINTS = `0,0 ${BAR_LENGTH},0 ${BAR_LENGTH},${BAR_WIDTH} 0,${BAR_WIDTH}`;

/**
 * Pixy sunburst logo. Same geometry as `assets/images/splash-sunburst.png`,
 * so it lines up with the native splash at the same size. `holeColor` paints
 * the center and must match the background behind the logo.
 */
export const SunburstLogo = ({
  size,
  color,
  holeColor,
}: {
  size: number;
  color: string;
  holeColor: string;
}) => (
  <Svg
    width={size}
    height={size}
    viewBox={`${-OUTER_RADIUS} ${-OUTER_RADIUS} ${OUTER_RADIUS * 2} ${OUTER_RADIUS * 2}`}
  >
    <G fill={color}>
      {Array.from({ length: RAYS }, (_, index) => (
        <Polygon
          key={index}
          points={BAR_POINTS}
          rotation={FIRST_ANGLE + index * (360 / RAYS)}
          origin="0, 0"
        />
      ))}
    </G>
    <Circle r={HOLE_RADIUS} fill={holeColor} />
  </Svg>
);
