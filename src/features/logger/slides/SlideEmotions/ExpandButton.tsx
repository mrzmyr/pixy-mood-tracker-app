import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { Pressable, Text, View } from "react-native";
import { Minus, Plus } from "react-native-feather";

/**
 * Toggle between basic and advanced emotions. `expanded` is true in basic
 * mode and shows the plus icon.
 */
export const ExpandButton = ({
  onPress,
  expanded,
}: {
  onPress: () => void;
  expanded: boolean;
}) => {
  const colors = useColors();

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          marginRight: 8,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        {expanded ? (
          <Plus width={24} height={24} color={colors.textSecondary} />
        ) : (
          <Minus width={24} height={24} color={colors.textSecondary} />
        )}
        <Text
          style={{
            marginLeft: 4,
            color: colors.textSecondary,
            fontSize: 17,
            fontWeight: "500",
          }}
        >
          {expanded ? t("more") : t("less")}
        </Text>
      </View>
    </Pressable>
  );
};
