import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { HeaderButton } from "@/components/header-button";
import ModalHeader from "@/components/modal-header";
import {
  SettingsForm,
  SettingsSection,
  SettingsSwitch,
} from "@/components/settings-form";
import useColors from "@/hooks/use-colors";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import useHaptics from "@/hooks/use-haptics";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { RequestTextField } from "../components/request-text-field";
import { useRequestForm } from "../hooks/use-request-form";
import type { RequestKind } from "../hooks/use-request-form";

const KINDS = {
  emotion: {
    title: "request_emotion_title",
    subtitle: "request_emotion_subtitle",
    placeholder: "request_emotion_placeholder",
    footer: "request_emotion_description",
  },
  role: {
    title: "request_role_title",
    subtitle: "request_role_subtitle",
    placeholder: "request_role_placeholder",
    footer: null,
  },
} as const satisfies Record<
  RequestKind,
  {
    title: TranslationKey;
    subtitle: TranslationKey;
    placeholder: TranslationKey;
    footer: TranslationKey | null;
  }
>;

const isRequestKind = (value: unknown): value is RequestKind =>
  value === "emotion" || value === "role";

// Same native bar items as the feedback form.
const ICONS =
  Platform.OS === "ios"
    ? ({ cancel: "xmark", send: "arrow.up" } as const)
    : {
        cancel: require("../../../../assets/images/icons/close.png"),
        send: require("../../../../assets/images/icons/send.png"),
      };

/**
 * Request route (`/request?kind=emotion|role`): asks for a missing emotion or
 * person role. Sends feedback of type `kind`. Nothing is added to the list:
 * the request only reaches the developer.
 *
 * Presented like the feedback form: iOS form sheet with native bar items,
 * close leads, send trails, title centered. The body is a native grouped
 * list: the word, then "Want a reply?" with the email. On success the sheet
 * closes and a toast confirms. A failed send keeps the draft.
 */
export const RequestScreen = () => {
  const router = useRouter();
  const colors = useColors();
  const haptics = useHaptics();
  const headerHeight = useHeaderHeight();
  const analytics = useAnalytics();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = isRequestKind(params.kind) ? params.kind : "emotion";
  const copy = KINDS[kind];
  const form = useRequestForm(kind);
  const wasSent = useRef(false);
  const { allowLeave } = useDiscardGuard({ isDirty: form.hasDraft });

  const trackOpened = useEffectEvent(() => {
    analytics.track("feedback:modal_opened", { type: kind });
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

  const send = async () => {
    const { replyTo } = form;
    if (await form.send()) {
      wasSent.current = true;
      haptics.success();
      allowLeave();
      router.back();
      showToast({
        title: t("request_sent"),
        message: replyTo ? t("request_sent_reply") : undefined,
      });
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t(copy.title),
          // A swipe during the request would close before the result is known.
          gestureEnabled: !form.isSending,
          // Web has no native toolbar items: it draws its own header below.
          headerShown: Platform.OS !== "web",
        }}
      />
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
              accessibilityLabel={t("request_sending")}
              color={colors.loadingIndicator}
            />
          </Stack.Toolbar.View>
        ) : (
          <Stack.Toolbar.Button
            icon={ICONS.send}
            accessibilityLabel={t("request_send")}
            variant="prominent"
            disabled={!form.canSend}
            onPress={send}
          >
            {t("request_send")}
          </Stack.Toolbar.Button>
        )}
      </Stack.Toolbar>
      {Platform.OS === "web" && (
        <ModalHeader
          title={t(copy.title)}
          left={
            <HeaderButton
              kind="cancel"
              label={t("cancel")}
              testID={`request-${kind}-close`}
              onPress={() => router.back()}
              disabled={form.isSending}
            />
          }
          right={
            <HeaderButton
              kind="send"
              label={t("request_send")}
              testID={`request-${kind}-send`}
              onPress={send}
              disabled={!form.canSend}
            />
          }
        />
      )}
      {/* iOS form sheet header is transparent: start the list below it. */}
      <View
        style={{
          flex: 1,
          paddingTop: Platform.OS === "ios" ? headerHeight : 0,
          backgroundColor: colors.background,
        }}
      >
        <SettingsForm>
          <SettingsSection
            title={t(copy.subtitle)}
            footer={copy.footer === null ? undefined : t(copy.footer)}
          >
            <RequestTextField
              testID={`request-${kind}-word`}
              placeholder={t(copy.placeholder)}
              onChangeText={form.handleWordChange}
              autoFocus
              maxLength={40}
            />
          </SettingsSection>
          <SettingsSection
            footer={form.hasFailed ? t("request_error") : undefined}
          >
            <SettingsSwitch
              testID={`request-${kind}-reply`}
              label={t("request_reply")}
              value={form.wantsReply}
              onValueChange={form.handleWantsReplyChange}
            />
            {form.wantsReply && (
              <RequestTextField
                testID={`request-${kind}-email`}
                placeholder={t("feedback_modal_email_placeholder")}
                onChangeText={form.handleEmailChange}
                keyboardType="email-address"
              />
            )}
          </SettingsSection>
        </SettingsForm>
      </View>
    </>
  );
};
