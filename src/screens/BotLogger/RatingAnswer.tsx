import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import useScale from "@/hooks/useScale";
import { View } from "react-native";
import ScaleButton from "./ScaleButton";

export const RatingAnswer = ({
  onPress
}: {
  onPress: (key: string) => void;
}) => {
  let { colors: scaleColors, labels } = useScale();
  const _labels = labels.slice().reverse();
  const haptics = useHaptics();
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: 'row',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          justifyContent: 'center',
          paddingHorizontal: 12,
          backgroundColor: colors.logCardBackground,
          borderRadius: 12,
          paddingVertical: 8,
        }}
      >
        {Object.keys(scaleColors).reverse().map((key, index) => {
          return (
            <ScaleButton
              accessibilityLabel={_labels[index]}
              key={key}
              isFirst={index === 0}
              isLast={index === _labels.length - 1}
              onPress={async () => {
                if (onPress) {
                  await haptics.selection();
                  onPress(key);
                }
              }}
              backgroundColor={scaleColors[key].background}
              textColor={scaleColors[key].text} />
          );
        })}
      </View>
    </View>
  );
};
