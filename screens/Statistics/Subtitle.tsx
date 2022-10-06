import { Text } from 'react-native';
import useColors from '../../hooks/useColors';

export const Subtitle = ({ children }: { children: string; }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        letterSpacing: -0.1,
        fontSize: 17,
        color: colors.textSecondary,
        marginTop: 8,
      }}
    >{children}</Text>
  );
};
