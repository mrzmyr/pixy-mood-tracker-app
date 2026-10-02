import { Image, View } from "react-native";
import type { ImageProps } from "react-native";
import useColors from "@/hooks/useColors";

/**
 * Real screenshots of the widget flow on iOS. Replace the files in
 * `assets/images/widget` after a widget change; see docs/widget.md.
 */
const GUIDE_IMAGES = [
  require("../../../../../assets/images/widget/intro.jpg"),
  require("../../../../../assets/images/widget/step-1.jpg"),
  require("../../../../../assets/images/widget/step-2.jpg"),
  require("../../../../../assets/images/widget/step-3.jpg"),
];

/** Screenshot card for a guide step; `step` must be 0 to 3. */
export const GuideImage = ({
  step,
  style,
}: {
  step: number;
  style?: ImageProps["style"];
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        borderRadius: 24,
        backgroundColor: colors.widgetGuideImageBackground,
        overflow: "hidden",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingTop: 24,
        paddingHorizontal: 24,
      }}
    >
      <Image
        source={GUIDE_IMAGES[step]}
        resizeMode="contain"
        style={[{ width: "100%", height: "100%" }, style]}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
};
