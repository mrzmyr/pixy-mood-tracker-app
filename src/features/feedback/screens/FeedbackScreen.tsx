import {
  Stack,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import type { NativeStackNavigationProp } from "expo-router/native-stack";
import { useHeaderHeight } from "expo-router/react-navigation";
import type { ParamListBase } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useRef } from "react";
import { ActivityIndicator, Platform, ScrollView } from "react-native";
import type { TextInputInstance } from "react-native";
import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import { useDiscardGuard } from "@/hooks/useDiscardGuard";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import type { FeedackType } from "../Feedback";
import ModalHeader from "@/components/ModalHeader";
import { FeedbackFields } from "../components/FeedbackFields";
import { getFeedbackTitle } from "../feedbackTitle";
import { useFeedbackForm } from "../hooks/useFeedbackForm";

// Exhaustive: TypeScript flags a missing key when `FeedackType` grows.
const FEEDBACK_TYPES: Record<FeedackType, true> = {
  issue: true,
  idea: true,
  other: true,
  emoji: true,
  custom: true,
  emotion: true,
};

const isFeedbackType = (value: unknown): value is FeedackType =>
  typeof value === "string" && Object.keys(FEEDBACK_TYPES).includes(value);

// iOS: SF Symbols in native bar buttons (Liquid Glass on iOS 26).
// Android: native top app bar items render image sources only (no SF Symbols,
// no text), so close and send ship as Material icon PNGs, like the calendar
// header icons.
const ICONS =
  Platform.OS === "ios"
    ? ({ cancel: "xmark", send: "arrow.up" } as const)
    : {
        cancel: require("../../../../assets/images/icons/close.png"),
        send: require("../../../../assets/images/icons/send.png"),
      };

/**
 * Feedback form route (`/feedback?type=issue|idea|…`). The `type` sets title
 * and placeholder; unknown values fall back to `issue`.
 *
 * iOS presents a form sheet, Android a full-screen dialog (see the app
 * layout). Header items are native: close leads, send trails. Send stays
 * disabled while the message is empty and shows a spinner while sending.
 * The screen closes only after the server accepted the feedback, so a
 * failed send keeps the draft. Closing with a draft asks to discard it.
 */
export const FeedbackScreen = () => {
  const router = useRouter();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const analytics = useAnalytics();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = isFeedbackType(params.type) ? params.type : "issue";
  const form = useFeedbackForm(type);
  const messageRef = useRef<TextInputInstance>(null);
  const wasSent = useRef(false);
  const { allowLeave } = useDiscardGuard({ isDirty: form.hasDraft });

  const trackOpened = useEffectEvent(() => {
    analytics.track("feedback:modal_opened", { type });
  });
  const trackClosed = useEffectEvent(() => {
    if (!wasSent.current) {
      analytics.track("feedback:modal_closed");
    }
  });

  useEffect(() => {
    trackOpened();
    return () => trackClosed();
  }, []);

  // Focus once the sheet finished sliding in: `autoFocus` during the
  // presentation animation is flaky on iOS.
  useEffect(
    () =>
      navigation.addListener("transitionEnd", (event) => {
        if (!event.data.closing) {
          messageRef.current?.focus();
        }
      }),
    [navigation]
  );

  const send = async () => {
    const isSent = await form.send();
    if (isSent) {
      wasSent.current = true;
      allowLeave();
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: getFeedbackTitle(type),
          // A swipe during the request would close before the result is known.
          gestureEnabled: !form.isSending,
          // Web has no native toolbar items: it draws its own header below.
          headerShown: Platform.OS !== "web",
        }}
      />
      {/* Title doubles as label: expo-router 57 drops `accessibilityLabel`
          on iOS bar items. With an icon, iOS shows only the icon. */}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={ICONS.cancel}
          accessibilityLabel={t("cancel")}
          disabled={form.isSending}
          onPress={() => router.back()}
        >
          {t("cancel")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {form.isSending ? (
          <Stack.Toolbar.View>
            <ActivityIndicator
              accessibilityLabel={t("send")}
              color={colors.loadingIndicator}
            />
          </Stack.Toolbar.View>
        ) : (
          <Stack.Toolbar.Button
            icon={ICONS.send}
            accessibilityLabel={t("send")}
            variant="prominent"
            disabled={!form.canSend}
            onPress={send}
          >
            {t("send")}
          </Stack.Toolbar.Button>
        )}
      </Stack.Toolbar>
      {Platform.OS === "web" && (
        <ModalHeader
          title={getFeedbackTitle(type)}
          left={
            <LinkButton
              testID="feedback-modal-cancel"
              type="primary"
              onPress={() => router.back()}
              disabled={form.isSending}
            >
              {t("cancel")}
            </LinkButton>
          }
          right={
            form.isSending ? (
              <ActivityIndicator
                accessibilityLabel={t("send")}
                color={colors.loadingIndicator}
              />
            ) : (
              <LinkButton
                testID="feedback-modal-send"
                type="primary"
                onPress={send}
                disabled={!form.canSend}
              >
                {t("send")}
              </LinkButton>
            )
          }
        />
      )}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.feedbackBackground }}
        // iOS form sheet header is transparent (app layout), and the automatic
        // content inset does not reach a ScrollView inside the sheet. Offset
        // by the header height.
        // Android and web headers are opaque: content starts below them.
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingTop: Platform.OS === "ios" ? headerHeight : 0,
        }}
        scrollIndicatorInsets={{
          top: Platform.OS === "ios" ? headerHeight : 0,
        }}
        // iOS insets the content above the keyboard natively. No offsets.
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        testID="feedback-screen"
      >
        <FeedbackFields
          type={type}
          message={form.message}
          email={form.email}
          messageRef={messageRef}
          hasFailed={form.hasFailed}
          onMessageChange={form.handleMessageChange}
          onEmailChange={form.handleEmailChange}
        />
      </ScrollView>
    </>
  );
};
