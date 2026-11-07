import { BottomSheet, RNHostView } from "@expo/ui";
import { presentationCornerRadius } from "@expo/ui/swift-ui/modifiers";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Headline, Secondary } from "@/components/type";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useScale from "@/hooks/use-scale";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import type { MoodTrigger } from "../mood-triggers";

// Android keeps Material's corner radius: `ModalBottomSheet` has no shape prop.
const sheetModifiers =
  Platform.OS === "ios" ? [presentationCornerRadius(16)] : undefined;

const MoodList = ({ triggers }: { triggers: MoodTrigger[] }) => {
  const scale = useScale(useSetting("scaleType"));

  return (
    <View style={{ gap: 8 }}>
      {triggers.map((trigger) => (
        <View
          key={trigger.rating}
          testID={`voice-help-mood-${trigger.rating}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: RADIUS.full,
              backgroundColor: scale.colors[trigger.rating].background,
            }}
          />
          <Body>{trigger.text}</Body>
        </View>
      ))}
    </View>
  );
};

/**
 * Voice mode help: an example sentence from the user's own words, what voice
 * mode picks up and how, plus every mood trigger word in the user's scale
 * colors. Native `@expo/ui` sheet: SwiftUI on iOS,
 * Material 3 on Android.
 */
export const VoiceHelpSheet = ({
  isOpen,
  onClose,
  triggers,
  example,
}: {
  isOpen: boolean;
  onClose: () => void;
  triggers: MoodTrigger[];
  example: string;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <BottomSheet
      isPresented={isOpen}
      onDismiss={onClose}
      snapPoints={["half", "full"]}
      contentPadding={0}
      containerColor={colors.bottomSheetBackground}
      modifiers={sheetModifiers}
    >
      <RNHostView>
        <ScrollView
          testID="voice-help"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 20,
            gap: 16,
          }}
        >
          <Headline accessibilityRole="header">
            {t("voice_help_title")}
          </Headline>
          <Body>{t("voice_help_intro")}</Body>
          <View style={{ gap: 4 }} testID="voice-help-example">
            <Secondary>{t("voice_help_example")}</Secondary>
            <Body>{t("voice_example_quote", { example })}</Body>
          </View>
          <Body>{t("voice_help_people")}</Body>
          <Body>{t("voice_help_tags")}</Body>
          <Body>{t("voice_help_mood")}</Body>
          <MoodList triggers={triggers} />
          <Body>{t("voice_help_review")}</Body>
        </ScrollView>
      </RNHostView>
    </BottomSheet>
  );
};
