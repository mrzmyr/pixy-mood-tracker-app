import { View } from "react-native";
import useHaptics from "@/hooks/use-haptics";
// oxlint-disable-next-line eslint/no-restricted-imports -- Persisted feature types stay in their modules until storage refactor.
import type { LogItem } from "@/features/logs";
import useScale from "@/hooks/use-scale";
import type { SettingsState } from "@/state/settings";
import ScaleButton from "@/components/scale-button";

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
  const _labels = [...labels].reverse();
  const selectedValues = Array.isArray(value) ? new Set(value) : null;
  const haptics = useHaptics();

  return (
    <View
      style={{
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        paddingVertical: 4,
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
