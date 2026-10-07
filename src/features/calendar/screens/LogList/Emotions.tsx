import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { t, tDynamic } from "@/lib/translation";
import keyBy from "lodash/keyBy";
import sortBy from "lodash/sortBy";
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

/**
 * Emotions of an entry card as one scrollable chip row, positive first.
 * Chips match the logger. A tap opens the logger at the
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
  const names = emotions.map((emotion) =>
    tDynamic(`log_emotion_${emotion.key}`)
  );

  return (
    <ChipRow
      inset={INSET}
      onPress={onEdit}
      accessibilityLabel={
        onEdit ? `${moduleName}: ${names.join(", ")}` : undefined
      }
      accessibilityHint={
        onEdit ? t("view_log_edit", { module: moduleName }) : undefined
      }
      testID={onEdit ? "log-list-emotions-edit" : undefined}
    >
      {emotions.map((emotion) => (
        <EmotionItem key={emotion.key} emotion={emotion} />
      ))}
    </ChipRow>
  );
};
