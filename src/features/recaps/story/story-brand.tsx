import { Image, Text, View } from "react-native";
import { STORY_MAX_FONT_SCALE, STORY_TYPE } from "./theme";

/**
 * Logo on the shared image. React Native `Image`, not expo-image: Android
 * Glide can decode to hardware bitmaps, which react-native-view-shot rejects.
 */
const LOGO = require("../../../../assets/images/icon.png");

/** App icon and name in the bottom left corner of every shared image. */
export const StoryBrand = ({ color }: { color: string }) => (
  <View
    testID="recap-story-brand"
    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
  >
    {/* oxlint-disable-next-line pixy-standards/radius-token -- story artwork, drawn at story scale */}
    <Image source={LOGO} style={{ width: 22, height: 22, borderRadius: 6 }} />
    <Text
      maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
      style={[STORY_TYPE.label, { fontSize: 15, color }]}
    >
      Pixy App
    </Text>
  </View>
);
