import { Text, TextStyle } from 'react-native';
import useColors from '../../../hooks/useColors';

export const SlideHeadline = ({
  children, style,
}: {
  children: string;
  style?: TextStyle;
}) => {
  const colors = useColors();

  return (
    <Text style={{
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
    }}>{children}</Text>
  );
};
