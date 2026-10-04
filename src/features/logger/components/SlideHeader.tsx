import Button from "@/components/Button";
import { CloseButton } from "@/components/CloseButton";
import { locale, t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useFeedbackModal } from "@/features/feedback";
import useHaptics from "@/hooks/useHaptics";
import { useTemporaryLog } from "../temporaryLog";
import { getItemDateTitle } from "@/lib/utils";
import dayjs from "dayjs";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { ArrowLeft, Trash } from "react-native-feather";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Stepper } from "./Stepper";

const DatePickerHeader = ({ onChange }: { onChange: (date: Date) => void }) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();

  return (
    <View
      style={{
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
      }}
    >
      <Button
        type="tertiary"
        onPress={() => {
          onChange(dayjs(tempLog.data.dateTime).hour(8).minute(0).toDate());
        }}
        style={{
          width: "100%",
          padding: 12,
          maxWidth: 240,
          marginBottom: 8,
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 17, color: colors.tertiaryButtonText }}>
          {t("morning")}
        </Text>
      </Button>
      <Button
        type="tertiary"
        onPress={() => {
          onChange(dayjs(tempLog.data.dateTime).hour(13).minute(0).toDate());
        }}
        style={{
          width: "100%",
          maxWidth: 240,
          padding: 12,
          marginBottom: 8,
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 17, color: colors.tertiaryButtonText }}>
          {t("afternoon")}
        </Text>
      </Button>
      <Button
        type="tertiary"
        onPress={() => {
          onChange(dayjs(tempLog.data.dateTime).hour(20).minute(0).toDate());
        }}
        style={{
          width: "100%",
          maxWidth: 240,
          padding: 12,
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 17, color: colors.tertiaryButtonText }}>
          {t("evening")}
        </Text>
      </Button>
    </View>
  );
};

/**
 * Logger header with the entry time, close, back, and delete actions.
 *
 * Must render inside `TemporaryLogProvider`. Changing the time updates only
 * the draft's `dateTime`; `date` keeps the day the draft started with.
 */
export const SlideHeader = ({
  isDeleteable,
  slideCount,
  slideIndex,
  backVisible,
  onBack,
  onClose,
  onDelete,
}: {
  isDeleteable: boolean;
  slideCount: number;
  slideIndex: number;
  backVisible?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onDelete?: () => void;
}) => {
  const { Modal } = useFeedbackModal();
  const haptics = useHaptics();
  const colors = useColors();
  const tempLog = useTemporaryLog();

  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const dateTime = tempLog.data.dateTime
    ? new Date(tempLog.data.dateTime)
    : new Date();
  const dateTimeTitle =
    tempLog.data.dateTime === null
      ? "?"
      : getItemDateTitle(tempLog.data.dateTime);

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        gap: 8,
      }}
    >
      {Platform.OS !== "web" && (
        <DateTimePickerModal
          // oxlint-disable-next-line react/no-unstable-nested-components -- react-native-modal-datetime-picker renders customHeaderIOS without props, so the header must close over this render's picker state setter.
          customHeaderIOS={() => (
            <DatePickerHeader
              onChange={(date) => {
                setIsDatePickerVisible(false);
                tempLog.update({
                  dateTime: dayjs(date).toISOString(),
                });
              }}
            />
          )}
          isVisible={isDatePickerVisible}
          locale={locale}
          date={dateTime}
          mode="datetime"
          minuteInterval={10}
          onConfirm={(date) => {
            setIsDatePickerVisible(false);
            tempLog.update({
              dateTime: dayjs(date).toISOString(),
            });
          }}
          onCancel={() => setIsDatePickerVisible(false)}
        />
      )}
      <View
        style={{
          alignItems: "flex-start",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <Modal />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            width: "100%",
          }}
        >
          {backVisible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("logger_back")}
              testID="logger-back"
              onPress={() => {
                haptics.selection();
                onBack?.();
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                width: 44,
              })}
            >
              <ArrowLeft color={colors.logHeaderText} width={24} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={dateTimeTitle}
              testID="logger-date"
              onPress={() => {
                haptics.selection();
                setIsDatePickerVisible(true);
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                flexDirection: "row",
                alignItems: "center",
                minHeight: 44,
                flexShrink: 1,
                // Lines the pill up with the 20pt slide content.
                marginLeft: 8,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: colors.logHeaderHighlight,
                borderRadius: 8,
              })}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: colors.logHeaderText,
                  flexShrink: 1,
                }}
              >
                {dateTimeTitle}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      {slideCount > 1 && <Stepper count={slideCount} index={slideIndex} />}
      <View
        style={{
          alignItems: "flex-end",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
          }}
        >
          {isDeleteable && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("delete")}
              testID="logger-delete"
              style={{
                height: 44,
                width: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={async () => {
                await haptics.selection();
                onDelete?.();
              }}
            >
              <Trash color={colors.logHeaderText} width={24} height={24} />
            </Pressable>
          )}
          <CloseButton testID="logger-close" onPress={() => onClose?.()} />
        </View>
      </View>
    </View>
  );
};
