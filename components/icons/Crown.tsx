import Svg, { Path } from "react-native-svg";

export const Crown = ({
  color = 'white',
  width = 24,
  height = 24,
}) => (
  <Svg fill={color || 'currentColor'} width={width} height={height} viewBox="0 0 24 24"><Path fill="none" d="M0 0h24v24H0z" /><Path d="M2 19h20v2H2v-2zM2 5l5 3 5-6 5 6 5-3v12H2V5z" /></Svg>
)