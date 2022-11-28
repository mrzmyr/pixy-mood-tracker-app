import { Text } from 'react-native';
import useColors from '../../../hooks/useColors';

export const SlideHeadline = ({
  children,
}: {
  children: string;
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
