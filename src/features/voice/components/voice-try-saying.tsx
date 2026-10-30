import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Body, Secondary } from "@/components/type";
import { t } from "@/lib/translation";

/** Empty state of voice mode: what to say, before the first card appears. */
export const VoiceTrySaying = ({ example }: { example: string }) => (
  <Animated.View
    entering={FadeIn.duration(300)}
    exiting={FadeOut.duration(150)}
    style={{ gap: 4, paddingTop: 8 }}
    testID="voice-try-saying"
  >
    <Secondary>{t("voice_try_saying")}</Secondary>
    <Body>{t("voice_example_quote", { example })}</Body>
  </Animated.View>
);
