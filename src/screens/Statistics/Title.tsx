import { Text } from 'react-native';
import useColors from '../../hooks/useColors';

export const Title = ({ children }: { children: string; }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        fontSize: 20,
        color: colors.text,
        fontWeight: 'bold',
        marginTop: 16,
      }}
    >{children}</Text>
  );
};
