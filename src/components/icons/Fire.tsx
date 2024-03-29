import Svg, { Path } from "react-native-svg";

export const Fire = ({
  color = 'white',
  width = 24,
  height = 24,
}) => (
  <Svg viewBox="0 0 24 24" fill={color || 'currentColor'} width={width} height={height}><Path fill="none" d="M0 0h24v24H0z" /><Path d="M12 23a7.5 7.5 0 0 1-5.138-12.963C8.204 8.774 11.5 6.5 11 1.5c6 4 9 8 3 14 1 0 2.5 0 5-2.47.27.773.5 1.604.5 2.47A7.5 7.5 0 0 1 12 23z" /></Svg>
)