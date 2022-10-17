import { View } from 'react-native';

export function ColorDot({
  color,
}: {
  color: string;
}) {
  return (
    <View
      style={{
        padding: 3,
        backgroundColor: color,
        flex: 1,
        borderRadius: 4,
        width: '100%',
        aspectRatio: 1,
        margin: 4,
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: 50,
      }} />
  );
}
