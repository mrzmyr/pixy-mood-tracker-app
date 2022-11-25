import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";
import { LogItem } from "../../hooks/useLogs";

export const EntryMessage = ({
  item
}: {
  item: LogItem;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const navigation = useNavigation();

  return (
    <View
      style={{
        marginTop: 8,
      }}
    >
      {/* <Pressable
        onPress={() => {
          haptics.selection();
          navigation.navigate('LogEdit', {
            id: item.id,
            step: 'message',
          });
        }}
      > */}
      <Text
        numberOfLines={3}
        ellipsizeMode="tail"
        style={{
          fontSize: 17,
          color: colors.textSecondary,
          lineHeight: 24,
        }}
      >{item.message}</Text>
      {/* </Pressable> */}
    </View>
  );
};
