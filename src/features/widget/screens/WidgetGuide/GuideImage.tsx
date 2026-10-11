import { useState } from "react";
import { Image, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import useColors from "@/hooks/useColors";

/** Same inset on every side of the screenshot. */
const IMAGE_INSET = 24;
/** Top corners of the screenshot. Bottom corners stay square. */
const IMAGE_TOP_RADIUS = 16;
/** Cropped guide shots: top 1600 px of an iPhone screenshot, saved at 600×820. */
const IMAGE_ASPECT = 600 / 820;

/**
 * Real screenshots of the widget flow on iOS. Replace the files in
 * `assets/images/widget` after a widget change.
 */
const GUIDE_IMAGES = [
  require("../../../../../assets/images/widget/step-1.jpg"),
  require("../../../../../assets/images/widget/step-2.jpg"),
  require("../../../../../assets/images/widget/step-3.jpg"),
];

/**
 * Largest 600×820 frame that fits in `width` × `height` after `inset` on
 * every side. The whole screenshot stays visible.
 */
const fitGuideImage = ({
  width,
  height,
  inset,
}: {
  width: number;
  height: number;
  inset: number;
}) => {
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;

  if (innerWidth <= 0 || innerHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const heightAtFullWidth = innerWidth / IMAGE_ASPECT;

  if (heightAtFullWidth <= innerHeight) {
    return { width: innerWidth, height: heightAtFullWidth };
  }

  return { width: innerHeight * IMAGE_ASPECT, height: innerHeight };
};

/** Screenshot card for a guide step; `step` must be 1 to 3. */
export const GuideImage = ({ step }: { step: number }) => {
  const colors = useColors();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const imageSize = fitGuideImage({
    width: box.width,
    height: box.height,
    inset: IMAGE_INSET,
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setBox((current) => {
      if (current.width === width && current.height === height) {
        return current;
      }

      return { width, height };
    });
  };

  return (
    <View
      onLayout={onLayout}
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        borderRadius: 24,
        backgroundColor: colors.widgetGuideImageBackground,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      <View
        style={{
          width: imageSize.width,
          height: imageSize.height,
          borderTopLeftRadius: IMAGE_TOP_RADIUS,
          borderTopRightRadius: IMAGE_TOP_RADIUS,
          overflow: "hidden",
        }}
      >
        <Image
          source={GUIDE_IMAGES[step - 1]}
          resizeMode="contain"
          style={{ width: "100%", height: "100%" }}
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
};
