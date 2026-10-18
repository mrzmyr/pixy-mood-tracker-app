import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Check from "lucide-react-native/icons/check";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import { SheetModal } from "@/components/SheetModal";
import TextArea from "@/components/TextArea";
import { Secondary } from "@/components/Type";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { FEEDBACK_REASONS } from "../feedbackReasons";
import type { FeedbackReason } from "../feedbackReasons";

const LABELS: Record<FeedbackReason, TranslationKey> = {
  not_true: "recaps_feedback_reason_not_true",
  knew_already: "recaps_feedback_reason_knew_already",
  not_relevant: "recaps_feedback_reason_not_relevant",
  too_personal: "recaps_feedback_reason_too_personal",
  hard_to_understand: "recaps_feedback_reason_hard_to_understand",
  feels_judgmental: "recaps_feedback_reason_feels_judgmental",
};

const ReasonChip = ({
  reason,
  selected,
  onToggle,
}: {
  reason: FeedbackReason;
  selected: boolean;
  onToggle: () => void;
}) => {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onToggle}
      testID={`recap-feedback-reason-${reason}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: selected ? colors.text : colors.textSecondary,
        backgroundColor: selected ? colors.text : colors.cardBackground,
      }}
    >
      {selected && <Check width={16} height={16} color={colors.background} />}
      <Secondary style={{ color: selected ? colors.background : colors.text }}>
        {t(LABELS[reason])}
      </Secondary>
    </Pressable>
  );
};

/**
 * Not Helpful reasons: multi-select chips plus an optional note. Reasons go
 * to analytics as keys; the note goes to the Pixy team through feedback,
 * never to analytics.
 */
export const FeedbackSheet = ({
  visible,
  onCancel,
  onSend,
}: {
  visible: boolean;
  onCancel: () => void;
  onSend: (reasons: FeedbackReason[], note: string) => void;
}) => {
  const colors = useColors();
  const [reasons, setReasons] = useState<ReadonlySet<FeedbackReason>>(
    new Set()
  );
  const [note, setNote] = useState("");

  const reset = () => {
    setReasons(new Set());
    setNote("");
  };

  const toggle = (reason: FeedbackReason) =>
    setReasons((current) => {
      const next = new Set(current);
      if (next.has(reason)) {
        next.delete(reason);
      } else {
        next.add(reason);
      }
      return next;
    });

  return (
    <SheetModal
      visible={visible}
      onClose={() => {
        reset();
        onCancel();
      }}
      backgroundColor={colors.feedbackBackground}
    >
      <View style={{ flex: 1, backgroundColor: colors.feedbackBackground }}>
        <ModalHeader
          title={t("recaps_feedback_sheet_title")}
          left={
            <LinkButton
              type="primary"
              hitSlop={8}
              onPress={() => {
                reset();
                onCancel();
              }}
              testID="recap-feedback-cancel"
            >
              {t("cancel")}
            </LinkButton>
          }
          right={
            <LinkButton
              type="primary"
              hitSlop={8}
              onPress={() => {
                onSend(
                  FEEDBACK_REASONS.filter((reason) => reasons.has(reason)),
                  note.trim()
                );
                reset();
              }}
              testID="recap-feedback-send"
            >
              {t("send")}
            </LinkButton>
          }
        />
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {FEEDBACK_REASONS.map((reason) => (
              <ReasonChip
                key={reason}
                reason={reason}
                selected={reasons.has(reason)}
                onToggle={() => toggle(reason)}
              />
            ))}
          </View>
          <View style={{ gap: 8 }}>
            <TextArea
              testID="recap-feedback-note"
              accessibilityLabel={t("recaps_feedback_note_placeholder")}
              style={{ height: 120 }}
              value={note}
              onChange={setNote}
              placeholder={t("recaps_feedback_note_placeholder")}
            />
            <Secondary>{t("recaps_feedback_note_hint")}</Secondary>
          </View>
        </ScrollView>
      </View>
    </SheetModal>
  );
};
