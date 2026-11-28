import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { Pressable, View } from "react-native";
import { Label } from "@/components/typography";
import { MinusIcon, PlusIcon } from "@/components/icons";

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
    <Pressable onPress={onPress} accessibilityRole="button">
      <View
        style={{
          marginRight: 8,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
        }}
      >
        {expanded ? (
          <PlusIcon width={24} height={24} color={colors.textSecondary} />
        ) : (
          <MinusIcon width={24} height={24} color={colors.textSecondary} />
        )}
        <Label
          size={16}
          style={{
            marginLeft: 4,
            color: colors.textSecondary,
            fontWeight: "500",
          }}
        >
          {expanded ? t("more") : t("less")}
        </Label>
      </View>
    </Pressable>
  );
};
