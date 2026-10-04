import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Plus } from "react-native-feather";
import LinkButton from "@/components/LinkButton";
import { RequestEmotionSheet } from "@/features/feedback";
import { EMOTIONS, EmotionIndicator } from "@/features/logger";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import type { Emotion } from "@/types";
import { StepSwitch } from "../components/StepSwitch";

const GROUPS = [
  { mood: "good", categories: ["very_good", "good"] },
  { mood: "mixed", categories: ["neutral"] },
  { mood: "hard", categories: ["bad", "very_bad"] },
] as const satisfies {
  mood: string;
  categories: Emotion["category"][];
}[];

const EmotionCell = ({ emotion }: { emotion: Emotion }) => {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={emotion.label}
      accessibilityHint={emotion.description}
      onPress={() => Alert.alert(emotion.label, emotion.description)}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.logCardBackground,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.menuListItemBorder,
        paddingVertical: 12,
        paddingHorizontal: 14,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <EmotionIndicator category={emotion.category} />
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontSize: 17, fontWeight: "500", color: colors.text }}
      >
        {emotion.label}
      </Text>
    </Pressable>
  );
};

/**
 * Settings > Check-in > Emotions: the step switch, a link to request a
 * missing emotion, and every enabled emotion grouped by mood. Tapping an
 * emotion shows its description.
 */
export const SettingsEmotions = () => {
  const colors = useColors();
  const analytics = useAnalytics();
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const closeRequest = useCallback(() => setIsRequestOpen(false), []);

  const enabled = EMOTIONS.filter((emotion) => emotion.disabled !== true);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RequestEmotionSheet
        visible={isRequestOpen}
        source="settings"
        onClose={closeRequest}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <StepSwitch step="emotions" />
        <View style={{ marginHorizontal: 16, flexDirection: "row" }}>
          <LinkButton
            testID="request-emotion"
            icon={Plus}
            onPress={() => {
              analytics.track("feedback:modal_opened", { type: "emotion" });
              setIsRequestOpen(true);
            }}
          >
            {t("request_emotion")}
          </LinkButton>
        </View>
        {GROUPS.map(({ mood, categories }) => {
          const inGroup = new Set<Emotion["category"]>(categories);
          const emotions = enabled
            .filter((emotion) => inGroup.has(emotion.category))
            .sort((a, b) => a.label.localeCompare(b.label));
          const rows = Array.from(
            { length: Math.ceil(emotions.length / 2) },
            (_, index) => emotions.slice(index * 2, index * 2 + 2)
          );

          return (
            <View key={mood} style={{ marginHorizontal: 16, marginTop: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  marginBottom: 8,
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    textTransform: "uppercase",
                  }}
                >
                  {t(`request_emotion_mood_${mood}`)}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  {emotions.length}
                </Text>
              </View>
              {rows.map((row) => (
                <View
                  key={row[0].key}
                  style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}
                >
                  {row.map((emotion) => (
                    <EmotionCell key={emotion.key} emotion={emotion} />
                  ))}
                  {row.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
