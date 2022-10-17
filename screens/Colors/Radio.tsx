import { TouchableOpacity, View } from 'react-native';
import { Circle } from 'react-native-feather';
import useColors from '../../hooks/useColors';

export function Radio({
  onPress, children, isSelected = false,
}: {
  onPress: () => void;
  children: React.ReactNode;
  isSelected?: boolean;
}) {
  const colors = useColors();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: colors.menuListItemBackground,
        padding: 16,
        borderRadius: 10,
      }}
    >
      <>
        <View style={{
          width: '15%',
          justifyContent: 'center',
          flexDirection: 'row',
          position: 'relative',
        }}>
          <Circle width={24} color={colors.text} />
          {isSelected &&
            <View style={{
              width: 10,
              height: 10,
              backgroundColor: colors.text,
              position: 'absolute',
              borderRadius: 100,
              top: 7
            }}></View>}
        </View>
        <View
          style={{
            flex: 1,
          }}
        >
          {children}
        </View>
      </>
    </TouchableOpacity>
  );
}
