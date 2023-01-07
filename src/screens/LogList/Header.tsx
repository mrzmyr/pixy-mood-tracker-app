import { Pressable, Text, View } from "react-native";
import { X } from "react-native-feather";
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";

export const Header = ({
  title, onClose,
}: {
  title: string;
  onClose?: () => void;
}) => {
  const haptics = useHaptics();
  const colors = useColors();

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      paddingHorizontal: 16,
      marginBottom: 8,
    }}>
      <View
        style={{
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
            }}
          >{title}</Text>
        </View>
      </View>
      <View
        style={{
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            marginRight: -8,
          }}
        >
          <Pressable
            style={{
              padding: 12,
            }}
            onPress={async () => {
              await haptics.selection();
              onClose?.();
            }}
          >
            <X color={colors.logHeaderText} width={22} height={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};
