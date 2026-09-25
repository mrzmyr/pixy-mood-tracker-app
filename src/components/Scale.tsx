import { View } from "react-native";
import useHaptics from "@/hooks/useHaptics";
import type { LogItem } from "@/hooks/useLogs";
import useScale from "@/hooks/useScale";
import type { SettingsState } from "@/hooks/useSettings";
import ScaleButton from "./ScaleButton";

const Scale = ({
  type,
  value,
  onPress = null,
}: {
  type: SettingsState["scaleType"];
  value?: LogItem["rating"] | LogItem["rating"][];
  onPress?: ((rating: LogItem["rating"]) => void) | null;
}) => {
  const { colors, labels } = useScale(type);
  const _labels = labels.toReversed();
  const selectedValues = Array.isArray(value) ? new Set(value) : null;
  const haptics = useHaptics();

  return (
    <View
      style={{
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {_labels.map((key, index) => {
        const isSelected = selectedValues
          ? selectedValues.has(key)
          : value === key;

        return (
          <ScaleButton
            accessibilityLabel={_labels[index]}
            key={key}
            isFirst={index === 0}
            isLast={index === _labels.length - 1}
            isSelected={isSelected}
            onPress={async () => {
              if (onPress) {
                await haptics.selection();
                onPress(key);
              }
            }}
            backgroundColor={colors[key].background}
            textColor={colors[key].text}
          />
        );
      })}
    </View>
  );
};

export default Scale;
