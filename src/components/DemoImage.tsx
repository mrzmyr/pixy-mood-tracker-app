import { useState } from "react";
import { Image, View } from "react-native";
import type { ImageSourcePropType, LayoutChangeEvent } from "react-native";
import { typeSpace } from "@/constants/typeSpace";
import useColors from "@/hooks/useColors";

/** Same inset on every side of the screenshot. */
const IMAGE_INSET = typeSpace.related;
/** Top corners of the screenshot. Bottom corners stay square. */
const IMAGE_TOP_RADIUS = 16;
/** Demo screenshots are cropped to 600×820. See docs/widget.md. */
const IMAGE_ASPECT = 600 / 820;

/**
 * Largest 600×820 frame that fits in `width` × `height` after `inset` on
 * every side. The whole screenshot stays visible.
 */
const fitDemoImage = ({
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

/**
 * Screenshot card for a {@link Demo} step. `source` is a 600×820 image; it
 * sits on the bottom edge of a rounded card.
 */
export const DemoImage = ({ source }: { source: ImageSourcePropType }) => {
  const colors = useColors();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const imageSize = fitDemoImage({
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
        backgroundColor: colors.demoImageBackground,
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
          source={source}
          resizeMode="contain"
          style={{ width: "100%", height: "100%" }}
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
};
