import { Pressable, View } from "react-native";
import { X } from "react-native-feather";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";

/** Close button and one progress segment per step, like a story bar. */
export const GuideProgress = ({
  step,
  steps,
  onClose,
}: {
  /** Current step, 1-based. */
  step: number;
  steps: number;
  onClose: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingTop: 16,
        paddingHorizontal: 20,
      }}
    >
      <Pressable
        testID="widget-guide-close"
        accessibilityRole="button"
        hitSlop={8}
        onPress={async () => {
          await haptics.selection();
          onClose();
        }}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.secondaryButtonBackground,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <X width={20} height={20} color={colors.text} />
      </Pressable>
      <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
        {Array.from({ length: steps }, (_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor:
                index < step
                  ? colors.widgetGuideProgressActive
                  : colors.widgetGuideProgressInactive,
            }}
          />
        ))}
      </View>
    </View>
  );
};
