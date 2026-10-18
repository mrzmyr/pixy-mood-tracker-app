import Info from "lucide-react-native/icons/info";
import { useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import Animated, {
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";
import palette from "@/constants/Colors/TailwindColors";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import useScale from "@/hooks/useScale";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import type { Emotion } from "@/types";
import { EmotionDial } from "./EmotionDial";
import { EmotionIndicator } from "./EmotionsIndicator";
import { rankByAffect } from "./emotionAffect";
import type { DialValues } from "./emotionAffect";

/** Closest emotions shown big above the "Further Away" divider. */
const TOP_COUNT = 6;
// Rows below the divider fade out with distance, but stay readable.
const MIN_OPACITY = 0.4;
const FADE_ROWS = 30;

type Item =
  | { type: "emotion"; emotion: Emotion; fit: number; rank: number }
  | { type: "divider" };

// Words for the dial position, also read by VoiceOver and TalkBack.
const word = (value: number, low: string, mid: string, high: string) => {
  if (value < -0.7) {
    return low;
  }
  return value > 0.7 ? high : mid;
};

const EmotionDialRow = ({
  emotion,
  fit,
  rank,
  selected,
  onPress,
}: {
  emotion: Emotion;
  fit: number;
  rank: number;
  selected: boolean;
  onPress: (emotion: Emotion) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const isTop = rank < TOP_COUNT;
  const unselectedBorderColor =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";
  const padding = isTop ? 12 : 8;

  return (
    <View
      style={{
        opacity: selected
          ? 1
          : Math.max(MIN_OPACITY, 1 - (rank - TOP_COUNT) / FADE_ROWS),
        marginBottom: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.logCardBackground,
          borderRadius: RADIUS.sm,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.tint : unselectedBorderColor,
        }}
      >
        <Pressable
          testID={`emotion-dials-row-${emotion.key}`}
          accessibilityRole="checkbox"
          accessibilityLabel={emotion.label}
          accessibilityState={{ checked: selected }}
          onPress={() => {
            haptics.selection();
            onPress(emotion);
          }}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: selected ? padding - 1 : padding,
            paddingLeft: selected ? 13 : 14,
          }}
        >
          <EmotionIndicator emotion={emotion} compact={!isTop} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: colors.text,
              fontWeight: "500",
              fontSize: isTop ? 17 : 15,
            }}
          >
            {emotion.label}
          </Text>
          <Text
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              fontVariant: ["tabular-nums"],
            }}
          >
            {`${fit}%`}
          </Text>
        </Pressable>
        <Pressable
          testID={`emotion-dials-info-${emotion.key}`}
          accessibilityRole="button"
          accessibilityLabel={t("log_emotions_dials_about", {
            emotion: emotion.label,
          })}
          accessibilityState={{ expanded: isInfoOpen }}
          hitSlop={8}
          onPress={() => setIsInfoOpen((isOpen) => !isOpen)}
          style={{
            paddingHorizontal: 12,
            alignSelf: "stretch",
            justifyContent: "center",
          }}
        >
          <Info
            width={18}
            height={18}
            color={isInfoOpen ? colors.tint : colors.textSecondary}
          />
        </Pressable>
      </View>
      {isInfoOpen && (
        <Text
          style={{
            marginTop: 6,
            marginHorizontal: 14,
            fontSize: 15,
            lineHeight: 20,
            color: colors.textSecondary,
          }}
        >
          {emotion.description}
        </Text>
      )}
    </View>
  );
};

/**
 * Dials picker for the emotions slide (flag `emotion-dials`). Two dials set
 * energy and pleasantness; every emotion re-sorts live by distance on the
 * affect grid. The closest six show big, the rest sit below "Further Away"
 * and fade. Ranking never uses history. Pleasantness starts from the mood
 * rating. Reorders animate unless reduce motion is on.
 */
export const EmotionDials = ({
  emotions,
  initialPleasantness,
  selectedEmotions,
  onPress,
}: {
  emotions: Emotion[];
  initialPleasantness: number;
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
}) => {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isReducedMotion = useReducedMotion();
  const scale = useScale(useSetting("scaleType"));
  const [dials, setDials] = useState<DialValues>({
    pleasantness: initialPleasantness,
    energy: 0,
  });

  const ranked = rankByAffect(emotions, dials);
  const items: Item[] = ranked.map(({ emotion, fit }, rank) => ({
    type: "emotion",
    emotion,
    fit,
    rank,
  }));
  items.splice(TOP_COUNT, 0, { type: "divider" });
  const selectedKeys = new Set(selectedEmotions.map((e) => e.key));

  return (
    <View style={{ flex: 1 }}>
      {/* Same card surface and border as the emotion rows below. */}
      <View
        testID="emotion-dials-card"
        style={{
          marginHorizontal: 20,
          marginTop: 8,
          paddingHorizontal: 14,
          paddingVertical: 8,
          gap: 8,
          backgroundColor: colors.logCardBackground,
          borderRadius: RADIUS.sm,
          borderWidth: 1,
          borderColor:
            colorScheme === "light"
              ? "rgba(0,0,0,0.1)"
              : "rgba(255,255,255,0.1)",
        }}
      >
        <EmotionDial
          testID="emotion-dials-energy"
          label={t("log_emotions_dials_energy")}
          valueText={word(
            dials.energy,
            t("log_emotions_dials_energy_value_low"),
            t("log_emotions_dials_energy_value_medium"),
            t("log_emotions_dials_energy_value_high")
          )}
          lowLabel={t("log_emotions_dials_energy_low")}
          highLabel={t("log_emotions_dials_energy_high")}
          gradient={[scale.colors.neutral.background, palette.amber[400]]}
          value={dials.energy}
          onChange={(energy) => setDials((d) => ({ ...d, energy }))}
        />
        <EmotionDial
          testID="emotion-dials-pleasantness"
          label={t("log_emotions_dials_pleasantness")}
          valueText={word(
            dials.pleasantness,
            t("log_emotions_dials_pleasantness_low"),
            t("log_emotions_dials_pleasantness_value_mixed"),
            t("log_emotions_dials_pleasantness_high")
          )}
          lowLabel={t("log_emotions_dials_pleasantness_low")}
          highLabel={t("log_emotions_dials_pleasantness_high")}
          gradient={[
            scale.colors.very_bad.background,
            scale.colors.neutral.background,
            scale.colors.very_good.background,
          ]}
          value={dials.pleasantness}
          onChange={(pleasantness) => setDials((d) => ({ ...d, pleasantness }))}
        />
      </View>
      <Animated.FlatList
        testID="emotion-dials-list"
        data={items}
        keyExtractor={(item) =>
          item.type === "divider" ? "divider" : item.emotion.key
        }
        itemLayoutAnimation={isReducedMotion ? undefined : LinearTransition}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 120,
        }}
        renderItem={({ item }) =>
          item.type === "divider" ? (
            <Text
              accessibilityRole="header"
              style={{
                marginTop: 8,
                marginBottom: 10,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: colors.textSecondary,
              }}
            >
              {t("log_emotions_dials_further")}
            </Text>
          ) : (
            <EmotionDialRow
              emotion={item.emotion}
              fit={item.fit}
              rank={item.rank}
              selected={selectedKeys.has(item.emotion.key)}
              onPress={onPress}
            />
          )
        }
      />
    </View>
  );
};
