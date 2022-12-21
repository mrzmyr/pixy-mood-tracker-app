import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { Pressable, Text, View } from "react-native";
import { Minus, Plus } from "react-native-feather";

export const ExpandButton = ({
  onPress, expanded,
}: {
  onPress: () => void;
  expanded: boolean;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
    >
      <View
        style={{
          marginRight: 8,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
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
            fontWeight: '500',
          }}
        >
          {expanded ? t('more') : t('less')}
        </Text>
      </View>
    </Pressable>
  );
};
