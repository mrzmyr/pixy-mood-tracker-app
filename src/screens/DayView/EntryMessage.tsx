import { Text, View } from "react-native";
import useColors from "../../hooks/useColors";
import { LogItem } from "../../hooks/useLogs";

export const EntryMessage = ({
  item,
  isExpanded,
}: {
  item: LogItem;
  isExpanded: boolean;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
      }}
    >
      <Text
        numberOfLines={isExpanded ? 0 : 2}
        ellipsizeMode="tail"
        style={{
          fontSize: 17,
          color: colors.textSecondary,
          lineHeight: 24,
        }}
      >{item.message}</Text>
    </View>
  );
};
