import { LinearGradient, Polygon, Stop } from 'react-native-svg';
import useColors from '../../hooks/useColors';

const BackgroundGardient = ({
  polygonPoints,
}) => {
  const colors = useColors();

  return (
    <>
      <Polygon points={polygonPoints} fill="url(#path)" />
      <LinearGradient id="path" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#333" stopOpacity="1" />
        <Stop offset="1" stopColor="transparent" stopOpacity="0" />
      </LinearGradient>
    </>
  );
};
