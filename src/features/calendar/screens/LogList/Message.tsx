import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { t } from "@/lib/translation";
import { Pressable, Text } from "react-native";
import { INSET } from "./layout";

/**
 * Note of an entry card. It comes last: notes can run to thousands of
 * characters, and everything above stays visible. A tap opens the logger at
 * the note step when `onEdit` is given. Without a note it renders nothing.
 */
export const Message = ({
  item,
  onEdit,
}: {
  item: LogItem;
  onEdit?: () => void;
}) => {
  const colors = useColors();
  const message = item.message.trim();

  if (message === "") {
    return null;
  }

  return (
    <Pressable
      testID={onEdit ? "log-list-message-edit" : undefined}
      disabled={!onEdit}
      onPress={onEdit}
      accessibilityRole={onEdit ? "button" : "text"}
      accessibilityHint={
        onEdit
          ? t("view_log_edit", { module: t("logger_step_message") })
          : undefined
      }
      style={({ pressed }) => ({
        paddingHorizontal: INSET,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 17, lineHeight: 24, color: colors.text }}>
        {message}
      </Text>
    </Pressable>
  );
};
