import { useState } from "react";
import { Headline } from "@/components/Type";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { t } from "@/lib/translation";
import { Pressable, Text, View } from "react-native";
import type { NativeSyntheticEvent, TextLayoutEventData } from "react-native";
import { INSET } from "./layout";

/** Lines of a note shown before "More". */
export const COLLAPSED_LINES = 6;

const NOTE_STYLE = { fontSize: 17, lineHeight: 24 } as const;

/**
 * Note of an entry card. It comes last: notes can run to thousands of
 * characters, and everything above stays visible. A tap on the text opens the
 * logger at the note step when `onEdit` is given. Without a note it renders
 * nothing.
 *
 * With `onToggleExpanded` the note folds to `COLLAPSED_LINES` lines. A
 * separate "More" / "Less" button below the text appears only when the text
 * really needs more lines than that: an invisible copy of the note without a
 * line limit reports the line count. The caller owns `expanded`, so it can
 * outlive the card when a list unmounts it. Without `onToggleExpanded` the
 * full text shows, because nothing could unfold it.
 */
export const Message = ({
  item,
  onEdit,
  expanded = false,
  onToggleExpanded,
}: {
  item: LogItem;
  onEdit?: () => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) => {
  const colors = useColors();
  const message = item.message.trim();
  // An expanded note was long when it was folded, so keep the button from the
  // first frame of a card that mounts again.
  const [isLong, setIsLong] = useState(expanded);

  if (message === "") {
    return null;
  }

  const onMeasure = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    setIsLong(event.nativeEvent.lines.length > COLLAPSED_LINES);
  };
  const canFold = onToggleExpanded !== undefined;
  const isFolded = canFold && !expanded;
  const style = { ...NOTE_STYLE, color: colors.text };

  return (
    <View style={{ gap: 8 }}>
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
        <Text
          testID="log-list-message-text"
          numberOfLines={isFolded ? COLLAPSED_LINES : undefined}
          style={style}
        >
          {message}
        </Text>
        {canFold && (
          <Text
            testID="log-list-message-measure"
            onTextLayout={onMeasure}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              style,
              {
                position: "absolute",
                left: INSET,
                right: INSET,
                top: 0,
                opacity: 0,
              },
            ]}
          >
            {message}
          </Text>
        )}
      </Pressable>
      {canFold && isLong && (
        <Pressable
          testID="log-list-message-toggle"
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggleExpanded}
          // 22 pt label plus slop makes the 44 pt target. The top slop ends at
          // the note text, so the button never takes a tap meant for the note.
          hitSlop={{ top: 8, bottom: 14, left: 16, right: 16 }}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            marginLeft: INSET,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Headline style={{ color: colors.tint }}>
            {expanded ? t("less") : t("more")}
          </Headline>
        </Pressable>
      )}
    </View>
  );
};
