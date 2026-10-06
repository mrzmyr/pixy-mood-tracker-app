import { EMOTIONS } from "@/features/logger";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { t, tDynamic } from "@/lib/translation";
import keyBy from "lodash/keyBy";
import sortBy from "lodash/sortBy";
import { Pressable, Text } from "react-native";
import { ChipRow } from "../Calendar/Timeline/ChipRow";
import { EmotionItem } from "./EmotionItem";
import { INSET } from "./layout";

const EMOTIONS_BY_KEY = keyBy(EMOTIONS, "key");
const EMOTIONS_CATEGORY_ORDER = {
  very_positive: 0,
  positive: 1,
  neutral: 2,
  negative: 3,
  very_negative: 4,
};
// Up to this many emotions read as one sentence; more become a chip row,
// so the block never grows past one line of chips.
const MAX_SENTENCE_EMOTIONS = 4;

/**
 * Emotions of an entry card, positive first. Few emotions read as a
 * sentence, many as a scrollable chip row. A tap opens the logger at the
 * emotions step when `onEdit` is given. Unknown keys from newer app versions
 * are skipped; without emotions it renders nothing.
 */
export const Emotions = ({
  item,
  onEdit,
}: {
  item: LogItem;
  onEdit?: () => void;
}) => {
  const colors = useColors();
  const emotions = sortBy(
    item.emotions.flatMap((key) =>
      EMOTIONS_BY_KEY[key] ? [EMOTIONS_BY_KEY[key]] : []
    ),
    (emotion) => EMOTIONS_CATEGORY_ORDER[emotion.category]
  );

  if (emotions.length === 0) {
    return null;
  }

  const moduleName = t("logger_step_emotions");
  const editLabel = t("view_log_edit", { module: moduleName });
  const testID = onEdit ? "log-list-emotions-edit" : undefined;

  if (emotions.length > MAX_SENTENCE_EMOTIONS) {
    return (
      <ChipRow
        inset={INSET}
        onPress={onEdit}
        accessibilityLabel={onEdit ? editLabel : undefined}
        testID={testID}
      >
        {emotions.map((emotion) => (
          <EmotionItem key={emotion.key} emotion={emotion} compact />
        ))}
      </ChipRow>
    );
  }

  const names = emotions.map((emotion) =>
    tDynamic(`log_emotion_${emotion.key}`)
  );

  return (
    <Pressable
      testID={testID}
      disabled={!onEdit}
      onPress={onEdit}
      accessibilityRole={onEdit ? "button" : "text"}
      accessibilityLabel={`${moduleName}: ${names.join(", ")}`}
      accessibilityHint={onEdit ? editLabel : undefined}
      style={({ pressed }) => ({
        paddingHorizontal: INSET,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 20,
          lineHeight: 26,
          fontWeight: "600",
          color: colors.text,
        }}
      >
        {names.join(", ")}
      </Text>
    </Pressable>
  );
};
