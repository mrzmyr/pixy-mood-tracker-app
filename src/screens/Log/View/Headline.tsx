import useColors from '../../../hooks/useColors';
import { Text } from 'react-native';

export const Headline = ({ children }) => {
  const colors = useColors();

  return (
    <Text style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 8, color: colors.text }}>
      {children}
    </Text>
  );
};
