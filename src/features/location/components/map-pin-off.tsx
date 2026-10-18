import Svg, { Circle, Line, Path } from "react-native-svg";

/** Feather `MapPin` with a diagonal strike: no location on the entry. */
export const MapPinOff = ({
  width = 24,
  height = 24,
  color,
}: {
  width?: number;
  height?: number;
  color: string;
}) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <Circle cx={12} cy={10} r={3} />
    <Line x1={2} y1={2} x2={22} y2={22} />
  </Svg>
);
