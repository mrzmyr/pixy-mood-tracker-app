import { Image } from "expo-image";
import type { ImageProps } from "expo-image";
import { Platform, useColorScheme } from "react-native";

const HEADER_IMAGES = {
  androidDark: [
    require(`../../../../../assets/images/onboarding/android-dark-2.png`),
    require(`../../../../../assets/images/onboarding/android-dark-3.png`),
    require(`../../../../../assets/images/onboarding/android-dark-4.png`),
    require(`../../../../../assets/images/onboarding/android-dark-5.png`),
  ],
  androidLight: [
    require(`../../../../../assets/images/onboarding/android-light-2.png`),
    require(`../../../../../assets/images/onboarding/android-light-3.png`),
    require(`../../../../../assets/images/onboarding/android-light-4.png`),
    require(`../../../../../assets/images/onboarding/android-light-5.png`),
  ],
  iosDark: [
    require(`../../../../../assets/images/onboarding/ios-dark-2.png`),
    require(`../../../../../assets/images/onboarding/ios-dark-3.png`),
    require(`../../../../../assets/images/onboarding/ios-dark-4.png`),
    require(`../../../../../assets/images/onboarding/ios-dark-5.png`),
  ],
  iosLight: [
    require(`../../../../../assets/images/onboarding/ios-light-2.png`),
    require(`../../../../../assets/images/onboarding/ios-light-3.png`),
    require(`../../../../../assets/images/onboarding/ios-light-4.png`),
    require(`../../../../../assets/images/onboarding/ios-light-5.png`),
  ],
};

/** Screenshots repeat the slide text, so screen readers skip them. */
const DECORATIVE = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
} as const;

/**
 * Onboarding screenshot for the platform and color scheme; `index` is the
 * slide index and must be 1 to 4. Cut-off screenshots fade out at the
 * bottom, so they sit on the sky without a hard edge. expo-image has no intrinsic size: `style` must set both width and
 * height (or `flex`).
 */
export const HeaderImage = ({
  index,
  style,
}: {
  index: number;
  style?: ImageProps["style"];
}) => {
  const isAndroid = Platform.OS === "android";
  const scheme = useColorScheme();

  if (scheme === "dark") {
    return (
      <Image
        style={style}
        {...DECORATIVE}
        source={
          isAndroid
            ? HEADER_IMAGES.androidDark[index - 1]
            : HEADER_IMAGES.iosDark[index - 1]
        }
      />
    );
  }
  return (
    <Image
      style={style}
      {...DECORATIVE}
      source={
        isAndroid
          ? HEADER_IMAGES.androidLight[index - 1]
          : HEADER_IMAGES.iosLight[index - 1]
      }
    />
  );
};
