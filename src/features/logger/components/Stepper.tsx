import { Pressable, View } from "react-native";
import useColors from "@/hooks/useColors";

/**
 * Progress segments above the logger slides; tapping a segment jumps to
 * that slide.
 */
export const Stepper = ({
  count,
  index,
  scrollTo,
}: {
  count: number;
  index: number;
  scrollTo: ({ index }) => void;
}) => {
  const colors = useColors();
  const steps = Array.from({ length: count }, (_, step) => step);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
      }}
    >
      {steps.map((step) => (
        <Pressable
          key={step}
          style={{
            paddingTop: 20,
            flexDirection: "row",
            alignItems: "center",
            flex: 4,
            paddingLeft: step === 0 ? 0 : 8,
            paddingRight: step === steps.length - 1 ? 0 : 8,
            paddingBottom: 16,
            overflow: "hidden",
          }}
          onPress={() => {
            scrollTo({ index: step });
          }}
        >
          <View
            style={{
              width: "100%",
              height: 8,
              borderRadius: 100,
              backgroundColor:
                step === index
                  ? colors.stepperBackgroundActive
                  : colors.stepperBackground,
            }}
          />
        </Pressable>
      ))}
    </View>
  );
};
