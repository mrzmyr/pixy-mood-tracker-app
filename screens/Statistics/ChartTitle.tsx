import { Text } from 'react-native';
import useColors from '../../hooks/useColors';

export const ChartTitle = ({ children }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.text,
        padding: 16,
        paddingBottom: 0,
        marginBottom: -24,
      }}
    >{children}</Text>
  );
};
