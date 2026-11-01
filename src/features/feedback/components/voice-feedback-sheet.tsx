import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Button from "@/components/button";
import { HeaderButton } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";
import LinkButton from "@/components/link-button";
import { SheetModal } from "@/components/sheet-modal";
import { getTextStyle, Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";
import { useFeedback } from "../feedback";
import { getNextVoiceFeedbackPrompt } from "../voice-feedback-prompt";

type Rating = "bad" | "okay" | "great";

const RATINGS: { rating: Rating; emoji: string; label: TranslationKey }[] = [
  { rating: "bad", emoji: "😕", label: "voice_feedback_bad" },
  { rating: "okay", emoji: "🙂", label: "voice_feedback_okay" },
  { rating: "great", emoji: "😍", label: "voice_feedback_great" },
];

// Let the saved confirmation land before the sheet slides in.
const SHOW_DELAY_MS = 800;

/** What the saved voice check-in contained. Counts only, never content. */
export interface VoiceFeedbackContext {
  durationMs: number;
  tagsCount: number;
  peopleCount: number;
  emotionsCount: number;
}

/**
 * Asks how a voice check-in went, after the entry is saved. Shows for the
 * first 3 voice check-ins only (`actionsDone`). One tap on a face sends the
 * rating to analytics. The optional comment goes to the feedback webhook,
 * never to analytics. Close, swipe down, and Skip count as skipped.
 */
export const VoiceFeedbackSheet = ({
  context,
}: {
  context: VoiceFeedbackContext;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const analytics = useAnalytics();
  const feedback = useFeedback();
  const { hasActionDone, addActionDone } = useSettings();
  const [prompt, setPrompt] = useState<{
    index: number;
    action: string;
  } | null>(null);
  // Decide once per saved entry: marking the prompt done must not pick the
  // next prompt for the same entry.
  const hasDecided = useRef(false);
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Prompt picked for this entry, waiting for the show delay.
  const [pending, setPending] = useState<typeof prompt>(null);

  useEffect(() => {
    if (hasDecided.current) {
      return;
    }
    hasDecided.current = true;
    setPending(getNextVoiceFeedbackPrompt(hasActionDone));
  }, [hasActionDone]);

  useEffect(() => {
    if (!pending) {
      return;
    }
    const id = setTimeout(() => {
      addActionDone(pending.action);
      setPrompt(pending);
      setPending(null);
      setVisible(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(id);
  }, [pending, addActionDone]);

  if (!prompt) {
    return null;
  }

  const close = () => {
    if (rating === null) {
      analytics.track("voice:feedback_skipped", {
        prompt_index: prompt.index,
      });
    }
    setVisible(false);
  };

  const pick = (next: Rating) => {
    haptics.selection();
    if (rating === null) {
      analytics.track("voice:feedback_submitted", {
        rating: next,
        prompt_index: prompt.index,
        duration_ms: context.durationMs,
        tags_count: context.tagsCount,
        people_count: context.peopleCount,
        emotions_count: context.emotionsCount,
      });
    }
    setRating(next);
  };

  const sendComment = async () => {
    setIsSending(true);
    await feedback.send({
      type: "other",
      source: "voice_mode",
      message: `[voice ${rating}] ${comment.trim()}`,
      onOk: () => {
        haptics.success();
        setVisible(false);
        showToast({ title: t("voice_feedback_thanks") });
      },
      onCancel: () => setIsSending(false),
    });
  };

  const done = () => {
    if (comment.trim() !== "") {
      sendComment();
      return;
    }
    showToast({ title: t("voice_feedback_thanks") });
    setVisible(false);
  };

  return (
    <SheetModal
      visible={visible}
      onClose={close}
      backgroundColor={colors.feedbackBackground}
    >
      <ModalHeader
        left={
          <HeaderButton
            kind="cancel"
            label={t("close")}
            testID="voice-feedback-close"
            onPress={close}
          />
        }
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        testID="voice-feedback"
        style={{ flex: 1, backgroundColor: colors.feedbackBackground }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 22, fontWeight: "700", color: colors.text }}
        >
          {t("voice_feedback_title")}
        </Text>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: "row", gap: 8, marginTop: 20 }}
        >
          {RATINGS.map((option) => {
            const isSelected = rating === option.rating;
            return (
              <Pressable
                key={option.rating}
                testID={`voice-feedback-${option.rating}`}
                accessibilityRole="radio"
                accessibilityLabel={t(option.label)}
                accessibilityState={{ checked: isSelected }}
                onPress={() => pick(option.rating)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 16,
                  borderRadius: RADIUS.md,
                  borderCurve: "continuous",
                  borderWidth: 2,
                  borderColor: isSelected
                    ? colors.primaryButtonBackground
                    : "transparent",
                  backgroundColor: colors.feedbackSelectionBackground,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 32 }}>{option.emoji}</Text>
                <Label size={14} style={{ color: colors.text }}>
                  {t(option.label)}
                </Label>
              </Pressable>
            );
          })}
        </View>
        {rating !== null && (
          <>
            <Label
              size={14}
              strong
              nativeID="voice-feedback-comment-label"
              style={{
                marginTop: 24,
                color: colors.text,
              }}
            >
              {t("voice_feedback_comment_label")}
            </Label>
            <TextInput
              // Mounts after the face tap, so focus here, not in `pick`.
              autoFocus
              testID="voice-feedback-comment"
              accessibilityLabel={t("voice_feedback_comment_label")}
              accessibilityLabelledBy="voice-feedback-comment-label"
              multiline
              maxLength={500}
              value={comment}
              onChangeText={setComment}
              placeholder={t("voice_feedback_comment_placeholder")}
              placeholderTextColor={colors.textInputPlaceholder}
              style={{
                marginTop: 8,
                minHeight: 96,
                borderRadius: RADIUS.sm,
                borderCurve: "continuous",
                paddingHorizontal: 14,
                paddingVertical: 12,
                ...getTextStyle("copy", 16),
                textAlignVertical: "top",
                backgroundColor: colors.textInputBackground,
                color: colors.text,
              }}
            />
            <Button
              testID="voice-feedback-done"
              disabled={isSending}
              onPress={done}
              style={{ marginTop: 16 }}
            >
              {comment.trim() === ""
                ? t("voice_feedback_done")
                : t("voice_feedback_send")}
            </Button>
          </>
        )}
        {rating === null && (
          <LinkButton
            testID="voice-feedback-skip"
            onPress={close}
            style={{ alignSelf: "center", marginTop: 16 }}
          >
            {t("voice_feedback_skip")}
          </LinkButton>
        )}
      </ScrollView>
    </SheetModal>
  );
};
