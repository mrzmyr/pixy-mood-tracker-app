import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import Share from "lucide-react-native/icons/share";
import { captureRef } from "react-native-view-shot";
import * as Sentry from "@sentry/react-native";
import LinkButton from "@/components/LinkButton";
import { RADIUS } from "@/constants/Radius";
import { t } from "@/lib/translation";
import { createStructuredError } from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";

const LOGO = require("../../../../assets/images/icon.png");

const Title = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        letterSpacing: -0.1,
        fontSize: 20,
        fontWeight: "bold",
        color: colors.text,
      }}
    >
      {children}
    </Text>
  );
};

const SubTitle = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        fontSize: 17,
        color: colors.textSecondary,
        marginTop: 4,
        marginBottom: 16,
      }}
    >
      {children}
    </Text>
  );
};

const Container = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: colors.cardBackground,
        borderRadius: RADIUS.md,
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginTop: 16,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: "column",
          width: "100%",
        }}
      >
        {children}
      </View>
    </View>
  );
};

const SHARE_DIALOG_TITLE =
  'Hey I use this app called "Pixy Mood Tracker" and I wanted to share this with you!';

/** view-shot returns a bare path; the share sheet wants a file URI. */
const toFileUri = (uri: string) =>
  uri.startsWith("file://") ? uri : `file://${uri}`;

const describeCause = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const reportShareError = (error: StructuredError) => {
  console.error(error);
  Sentry.captureException(error);
};

/**
 * Captures the mounted share copy and opens the share sheet.
 * `onCaptured` runs once the capture settles, so the caller can unmount the
 * copy before the share sheet closes. `onShared` runs when the share sheet
 * finished without error. Lives at module level: a `try` inside the
 * component body stops React Compiler from compiling `BigCard`.
 */
const shareCardImage = async ({
  view,
  card,
  onCaptured,
  onShared,
}: {
  view: View | null;
  card: string;
  onCaptured: () => void;
  onShared: () => void;
}) => {
  if (!view) {
    onCaptured();
    reportShareError(
      createStructuredError({
        status: "statistics_card_share_copy_missing",
        message: "Statistics card share copy is not mounted",
        why: `No share copy view for card "${card}" when the capture started`,
        fix: "Tap Share again",
      })
    );
    return;
  }

  let uri: string;
  try {
    uri = toFileUri(await captureRef(view));
  } catch (cause) {
    reportShareError(
      createStructuredError({
        status: "statistics_card_capture_failed",
        message: "Statistics card image could not be captured",
        why: `react-native-view-shot failed for card "${card}": ${describeCause(cause)}`,
        fix: "Tap Share again. If it fails again, restart Pixy",
      })
    );
    return;
  } finally {
    onCaptured();
  }

  try {
    await Sharing.shareAsync(uri, { dialogTitle: SHARE_DIALOG_TITLE });
  } catch (cause) {
    reportShareError(
      createStructuredError({
        status: "statistics_card_share_failed",
        message: "Statistics card share sheet failed",
        why: `expo-sharing failed for card "${card}": ${describeCause(cause)}`,
        fix: "Tap Share again. If it fails again, restart Pixy",
      })
    );
    return;
  }
  onShared();
};

/**
 * Statistics card with optional share action.
 *
 * With `isShareable`, tapping Share mounts a second, off-screen copy of
 * `children` with the Pixy logo. The copy is captured as the share image and
 * unmounts right after the capture, so children must tolerate a second
 * mount while sharing.
 */
export const BigCard = ({
  title,
  subtitle,
  children,
  isShareable,
  analyticsId,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  isShareable?: boolean;
  analyticsId: string;
}) => {
  const colors = useColors();
  const viewRef = useRef<View>(null);
  // Set on the first layout of the share copy; later layouts must not capture again.
  const captureStartedRef = useRef(false);
  const analytics = useAnalytics();
  const [isCapturing, setIsCapturing] = useState(false);

  const share = () => {
    if (isCapturing) {
      return;
    }
    setIsCapturing(true);
  };

  const onShareCopyLayout = () => {
    if (captureStartedRef.current) {
      return;
    }
    captureStartedRef.current = true;
    // Layout is done; wait one frame so the copy is drawn before the capture.
    requestAnimationFrame(() => {
      void shareCardImage({
        view: viewRef.current,
        card: analyticsId,
        onCaptured: () => {
          captureStartedRef.current = false;
          setIsCapturing(false);
        },
        onShared: () => {
          analytics.track("statistics:card_shared", { card: analyticsId });
        },
      });
    });
  };

  return (
    <>
      <Container>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {title ? <Title>{title}</Title> : <View />}
          <View
            style={{
              marginTop: -16,
              marginRight: -16,
              marginLeft: -16,
              marginBottom: -16,
              width: 48,
              height: 48,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isCapturing && (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            )}
            {!isCapturing && isShareable && (
              <LinkButton
                accessibilityLabel={t("a11y_share")}
                onPress={() => share()}
                style={{}}
              >
                <Share stroke={colors.tint} width={20} />
              </LinkButton>
            )}
          </View>
        </View>
        {subtitle && <SubTitle>{subtitle}</SubTitle>}
        {children}
      </Container>
      {/* Share copy */}
      {isShareable && isCapturing && (
        <View
          ref={viewRef}
          testID={`big-card-share-copy-${analyticsId}`}
          collapsable={false}
          onLayout={onShareCopyLayout}
          style={{
            position: "absolute",
            left: "-100%",
            top: "-100%",
            width: "100%",
            backgroundColor: colors.background,
            padding: 16,
            paddingTop: 0,
          }}
        >
          <Container>
            {title && <Title>{title}</Title>}
            {subtitle && <SubTitle>{subtitle}</SubTitle>}
            {children}
          </Container>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 16,
              marginLeft: -16,
            }}
          >
            <View
              style={{
                borderRadius: RADIUS.sm,
                backgroundColor: colors.sharingLogoBackground,
                marginRight: 8,
                padding: 2,
              }}
            >
              <Image
                source={LOGO}
                style={{
                  width: 32,
                  height: 32,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "bold",
                color: colors.sharingLogoText,
              }}
            >
              Pixy Mood Tracker
            </Text>
          </View>
        </View>
      )}
    </>
  );
};
