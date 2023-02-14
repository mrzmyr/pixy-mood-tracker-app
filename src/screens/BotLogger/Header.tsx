import { Pressable, View } from "react-native";
import { X } from "react-native-feather";
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";

export const Header = ({
  onClose,
}: {
  onClose?: () => void;
}) => {
  const haptics = useHaptics();
  const colors = useColors();

  return (
    <View style={{
      flexDirection: 'row',
      paddingTop: 8,
      paddingHorizontal: 20,
      justifyContent: 'flex-end',
    }}>
      <View
        style={{
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
          }}
        >
          <Pressable
            style={{
              padding: 8,
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
