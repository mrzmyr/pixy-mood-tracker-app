import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CircleQuestionMark from "lucide-react-native/icons/circle-question-mark";
import Button from "@/components/button";
import RouteModalHeader from "@/components/route-modal-header";
import { Body, Headline, Secondary } from "@/components/type";
import { SPACE } from "@/constants/space";
import { encodeLoggerPrefill } from "@/features/logger";
import type { LoggerPrefill } from "@/features/logger";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { VoiceHelpSheet } from "../components/voice-help-sheet";
import { VoiceInputPill } from "../components/voice-input-pill";
import { VoiceTranscript } from "../components/voice-transcript";
import { matchTranscript } from "../match-transcript";
import { getMoodTriggers, matchMood } from "../mood-triggers";
import { useVoiceTerms } from "../use-voice-terms";
import { buildVoiceExample } from "../voice-example";
import { useVoiceTranscription } from "../use-voice-transcription";
import type { VoiceErrorStatus, VoiceStatus } from "../use-voice-transcription";

/**
 * iOS sheet bar: no fill, so the transcript fades out under the close
 * button.
 */
const TRANSPARENT_BAR_OPTIONS = {
  headerTransparent: true,
  headerStyle: { backgroundColor: "transparent" },
};

// Listening has no label: the waveform shows it.
const STATUS_LABEL: Partial<Record<VoiceStatus, () => string>> = {
  preparing: () => t("voice_preparing"),
  paused: () => t("voice_paused"),
};

// Prefill list each match kind goes to.
const PREFILL_LIST = {
  person: (prefill: LoggerPrefill) => prefill.people,
  tag: (prefill: LoggerPrefill) => prefill.tags,
  emotion: (prefill: LoggerPrefill) => prefill.emotions,
};

const blockedCopy = (
  status: VoiceStatus,
  errorStatus: VoiceErrorStatus | undefined
) => {
  if (status === "denied") {
    return {
      title: t("voice_permission_title"),
      body: t("voice_permission_body"),
    };
  }
  if (errorStatus === "voice_siri_disabled") {
    return { title: t("voice_failed_title"), body: t("voice_failed_siri") };
  }
  const isLanguageMissing =
    errorStatus === "voice_on_device_unavailable" ||
    errorStatus === "voice_recognizer_unavailable";
  return {
    title: t("voice_failed_title"),
    body: isLanguageMissing
      ? t("voice_failed_language")
      : t("voice_failed_body"),
  };
};

/**
 * Voice mode: listen, show the live transcript with detected people, tags,
 * emotions, and the first spoken mood highlighted, then open the quick
 * check-in prefilled. Nothing is saved here.
 */
export const VoiceMode = () => {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const analytics = useAnalytics();
  const haptics = useHaptics();
  const terms = useVoiceTerms();
  const moodTriggers = useMemo(() => getMoodTriggers(), []);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const hasStarted = useRef(false);
  // Set when listening starts, in the start effect.
  const startedAt = useRef(0);
  // Screen lock would cut the recording mid-sentence.
  useKeepAwake();

  const voice = useVoiceTranscription({
    onPermissionDenied: (kind) =>
      analytics.track("voice:permission_denied", { kind }),
    onFailed: (error) =>
      analytics.track("voice:failed", { status: error.status }),
  });
  const hasText = voice.text.trim() !== "";
  // Picked when the screen opens: other tags and people each time. Terms
  // keep their identity while stores stay the same.
  const example = useMemo(
    () => buildVoiceExample(terms, moodTriggers),
    [terms, moodTriggers]
  );

  const { allowLeave } = useDiscardGuard({
    isDirty: hasText,
    onDiscard: () => {
      voice.pause();
      analytics.track("voice:flow_cancelled", {
        duration_ms: Date.now() - startedAt.current,
        transcript_length: voice.text.length,
      });
    },
  });

  const { start } = voice;
  useEffect(() => {
    // Start once on open.
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    startedAt.current = Date.now();
    analytics.track("voice:flow_started");
    start();
  }, [analytics, start]);

  const close = () => {
    if (!hasText) {
      voice.pause();
      analytics.track("voice:flow_cancelled", {
        duration_ms: Date.now() - startedAt.current,
        transcript_length: 0,
      });
    }
    // With text, the discard guard asks first.
    router.back();
  };

  const finish = () => {
    const message = voice.stop();
    if (message.trim() === "") {
      return;
    }
    const prefill: LoggerPrefill = {
      message,
      tags: [],
      people: [],
      emotions: [],
      rating: matchMood(message, moodTriggers)?.rating,
      source: "voice",
      durationMs: Date.now() - startedAt.current,
    };
    for (const match of matchTranscript(message, terms)) {
      PREFILL_LIST[match.kind](prefill).push(match.id);
    }
    analytics.track("voice:flow_finished", {
      duration_ms: Date.now() - startedAt.current,
      transcript_length: message.length,
      tags_count: prefill.tags.length,
      people_count: prefill.people.length,
      emotions_count: prefill.emotions.length,
      has_rating: prefill.rating !== undefined,
    });
    haptics.selection();
    allowLeave();
    router.replace({
      pathname: "/check-in/[id]",
      params: { id: "new", prefill: encodeLoggerPrefill(prefill) },
    });
  };

  const { pause: handlePause, resume: handleResume } = voice;
  const isListening = voice.status === "listening";
  // Pause also cancels setup, so it counts as running.
  const isRunning = isListening || voice.status === "preparing";
  const isBlocked = voice.status === "denied" || voice.status === "failed";
  const blocked = blockedCopy(voice.status, voice.error?.status);
  const statusLabel = STATUS_LABEL[voice.status]?.();

  // White like a sheet, not the grouped page gray.
  const background = colors.menuListItemBackground;

  return (
    <View style={{ flex: 1, backgroundColor: background }} testID="voice-mode">
      <RouteModalHeader title="" onClose={close} closeTestID="voice-close" />
      {Platform.OS === "ios" && (
        <Stack.Screen options={TRANSPARENT_BAR_OPTIONS} />
      )}

      <View
        style={{
          flex: 1,
          // iOS: the transparent bar overlaps the screen top.
          paddingTop: Platform.OS === "ios" ? headerHeight : 0,
        }}
      >
        <VoiceTranscript
          text={voice.text}
          terms={terms}
          triggers={moodTriggers}
          background={background}
        />
      </View>

      {isBlocked ? (
        <View
          style={{
            paddingHorizontal: SPACE.xl,
            paddingBottom: insets.bottom + SPACE.xl,
            gap: SPACE.md,
          }}
          accessibilityLiveRegion="polite"
        >
          <Headline accessibilityRole="header">{blocked.title}</Headline>
          <Body>{blocked.body}</Body>
          {voice.status === "denied" ? (
            <Button onPress={() => Linking.openSettings()}>
              {t("voice_open_settings")}
            </Button>
          ) : (
            <Button onPress={() => voice.start()}>
              {t("voice_try_again")}
            </Button>
          )}
          {hasText && (
            <Button type="secondary" onPress={finish}>
              {t("voice_done")}
            </Button>
          )}
        </View>
      ) : (
        <View
          style={{
            paddingHorizontal: SPACE.lg,
            paddingBottom: insets.bottom + SPACE.sm,
            gap: SPACE.lg,
          }}
        >
          <View style={{ gap: SPACE.xs, paddingHorizontal: SPACE.xs }}>
            {statusLabel && (
              <Headline accessibilityRole="header" testID="voice-status">
                {statusLabel}
              </Headline>
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACE.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Secondary>{t("voice_detects")}</Secondary>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("voice_help_title")}
                testID="voice-help-open"
                hitSlop={16}
                onPress={() => setIsHelpOpen(true)}
                style={({ pressed }) => ({
                  padding: 0,
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <CircleQuestionMark
                  width={18}
                  height={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
          <VoiceInputPill
            isRunning={isRunning}
            canResume={voice.status === "paused"}
            isListening={isListening}
            hasText={hasText}
            getLevel={voice.getLevel}
            onPause={handlePause}
            onResume={handleResume}
            onDone={finish}
          />
        </View>
      )}
      <VoiceHelpSheet
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        triggers={moodTriggers}
        example={example}
      />
    </View>
  );
};
