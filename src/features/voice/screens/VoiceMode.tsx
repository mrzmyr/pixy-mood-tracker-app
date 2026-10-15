import { useEffect, useMemo, useRef } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Mic, Pause } from "react-native-feather";
import dayjs from "dayjs";
import Button from "@/components/Button";
import { CloseButton } from "@/components/CloseButton";
import { Body, Headline, Secondary } from "@/components/Type";
import { RADIUS } from "@/constants/Radius";
import { encodeLoggerPrefill } from "@/features/logger";
import type { LoggerPrefill } from "@/features/logger";
import { useDiscardGuard } from "@/hooks/useDiscardGuard";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { VoiceBlob } from "../components/VoiceBlob";
import { VoiceMatchCard } from "../components/VoiceMatchCard";
import { VoiceWaveform } from "../components/VoiceWaveform";
import { matchTranscript } from "../matchTranscript";
import { useVoiceTerms } from "../useVoiceTerms";
import { useVoiceTranscription } from "../useVoiceTranscription";
import type { VoiceErrorStatus, VoiceStatus } from "../useVoiceTranscription";

const CONTROL_SIZE = 56;

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
 * Voice mode: listen, show detected people, tags, and emotions live, then
 * open the logger prefilled. Nothing is saved here.
 */
export const VoiceMode = () => {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const haptics = useHaptics();
  const terms = useVoiceTerms();
  const hasStarted = useRef(false);
  const cardsRef = useRef<ScrollView>(null);
  // Set when listening starts, in the start effect.
  const startedAt = useRef(0);

  const voice = useVoiceTranscription({
    onPermissionDenied: (kind) =>
      analytics.track("voice:permission_denied", { kind }),
    onFailed: (error) =>
      analytics.track("voice:failed", { status: error.status }),
  });
  const matches = useMemo(
    () => matchTranscript(voice.text, terms),
    [voice.text, terms]
  );
  const hasText = voice.text.trim() !== "";

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
    });
    haptics.selection();
    allowLeave();
    router.replace({
      pathname: "/logs/create/[dateTime]",
      params: {
        dateTime: dayjs().toISOString(),
        prefill: encodeLoggerPrefill(prefill),
      },
    });
  };

  const isListening = voice.status === "listening";
  const isBlocked = voice.status === "denied" || voice.status === "failed";
  const blocked = blockedCopy(voice.status, voice.error?.status);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === "android" ? insets.top : 0,
      }}
      testID="voice-mode"
    >
      <VoiceBlob level={voice.level} color={colors.primaryButtonBackground} />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingHorizontal: 12,
          paddingTop: 12,
        }}
      >
        <CloseButton onPress={close} testID="voice-close" />
      </View>

      <ScrollView
        ref={cardsRef}
        // Newest card last: keep it in view while the list grows.
        onContentSizeChange={() => cardsRef.current?.scrollToEnd()}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {matches.map((match) => (
          <VoiceMatchCard key={`${match.kind}:${match.id}`} match={match} />
        ))}
      </ScrollView>

      {isBlocked ? (
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            gap: 12,
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
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            gap: 20,
          }}
        >
          <View style={{ alignItems: "center", gap: 4 }}>
            {(isListening || voice.status === "paused") && (
              <Headline accessibilityRole="header" testID="voice-status">
                {isListening ? t("voice_listening") : t("voice_paused")}
              </Headline>
            )}
            <Secondary style={{ textAlign: "center" }}>
              {t("voice_hint")}
            </Secondary>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isListening ? t("voice_pause") : t("voice_resume")
              }
              testID="voice-pause"
              disabled={
                voice.status !== "listening" && voice.status !== "paused"
              }
              onPress={isListening ? voice.pause : voice.resume}
              style={({ pressed }) => ({
                width: CONTROL_SIZE,
                height: CONTROL_SIZE,
                borderRadius: RADIUS.full,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.tertiaryButtonBackground,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {isListening ? (
                <Pause
                  width={22}
                  height={22}
                  color={colors.tertiaryButtonText}
                />
              ) : (
                <Mic width={22} height={22} color={colors.tertiaryButtonText} />
              )}
            </Pressable>
            <VoiceWaveform
              getLevel={voice.getLevel}
              isActive={isListening}
              color={colors.primaryButtonBackground}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("voice_done")}
              accessibilityState={{ disabled: !hasText }}
              testID="voice-done"
              disabled={!hasText}
              onPress={finish}
              style={({ pressed }) => ({
                width: CONTROL_SIZE,
                height: CONTROL_SIZE,
                borderRadius: RADIUS.full,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: hasText
                  ? colors.primaryButtonBackground
                  : colors.primaryButtonBackgroundDisabled,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Check width={26} height={26} color={colors.primaryButtonText} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};
