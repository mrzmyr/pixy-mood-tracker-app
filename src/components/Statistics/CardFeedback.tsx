import { STATISTICS_FEEDBACK_URL } from "@/constants/API";
import { locale, t } from "@/helpers/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useSettings } from "@/state/settings";
import * as StoreReview from "expo-store-review";
import { useState } from "react";
import type { ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import pkg from "../../../package.json";
import Button from "../Button";
import TextArea from "../TextArea";

const DEFAULT_ANALYTICS_DATA = {};
const DEFAULT_STYLE = {};

const EMOJI_SCALE_IMAGES_DEFAULT = [
  {
    emoji: "😍",
    active: require(
      `../../../assets/images/emojis/smiling-face-with-heart-eyes_1f60d.png`
    ),
    disabled: require(
      `../../../assets/images/emojis/smiling-face-with-heart-eyes_1f60d-disabled.png`
    ),
  },
  {
    emoji: "🎉",
    active: require(`../../../assets/images/emojis/party-popper.png`),
    disabled: require(
      `../../../assets/images/emojis/party-popper-disabled.png`
    ),
  },
  {
    emoji: "😴",
    active: require(`../../../assets/images/emojis/sleeping-face_1f634.png`),
    disabled: require(
      `../../../assets/images/emojis/sleeping-face_1f634-disabled.png`
    ),
  },
  {
    emoji: "👎",
    active: require(`../../../assets/images/emojis/thumbs-down_1f44e.png`),
    disabled: require(
      `../../../assets/images/emojis/thumbs-down_1f44e-disabled.png`
    ),
  },
];

const EMOJI_SCALE_IMAGES_MINIMAL = [
  {
    emoji: "👍",
    active: require(`../../../assets/images/emojis/thumbs-up_1f44d.png`),
    disabled: require(
      `../../../assets/images/emojis/thumbs-up_1f44d-disabled.png`
    ),
  },
  {
    emoji: "👎",
    active: require(`../../../assets/images/emojis/thumbs-down_1f44e.png`),
    disabled: require(
      `../../../assets/images/emojis/thumbs-down_1f44e-disabled.png`
    ),
  },
];

const CardFeedbackEmoji = ({ image, onPress, selected }) => {
  const haptics = useHaptics();
  const colors = useColors();

  return (
    <Pressable
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 8,
        paddingBottom: 8,
        borderRadius: 8,
        backgroundColor: colors.statisticsFeedbackEmojiBackground,
      }}
      onPress={async () => {
        await haptics.selection();
        onPress?.();
      }}
    >
      <Image
        style={{
          opacity: selected ? 1 : colors.statisticsFeedbackEmojiOpacity,
          width: 20,
          height: 20,
        }}
        source={image}
      />
    </Pressable>
  );
};
/**
 * Emoji feedback row under statistics cards, posted to
 * {@link STATISTICS_FEEDBACK_URL} with `analyticsId` as the card type.
 *
 * Negative emojis ask for a comment first. A positive rating on the
 * `default` variant may request an App Store review. Never pass user text
 * in `analyticsData`; anonymize it first.
 */
export const CardFeedback = ({
  analyticsId,
  analyticsData = DEFAULT_ANALYTICS_DATA,
  variant = "default",
  style = DEFAULT_STYLE,
}: {
  analyticsId: string;
  analyticsData?: object;
  variant?: "default" | "minimal";
  style?: ViewStyle;
}) => {
  const analytics = useAnalytics();
  const colors = useColors();
  const { settings } = useSettings();

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [emojiSelected, setEmojiSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const [comment, setComment] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  const onSendDone = () => {
    setLoading(false);
    setShowTextInput(false);
    setFeedbackSent(true);
    setEmojiSelected(null);

    setTimeout(() => {
      setFeedbackSent(false);
    }, 5000);
  };

  const send = async (emoji) => {
    setLoading(true);

    const metaData = {
      date: new Date().toISOString(),
      locale,
      version: pkg.version,
      os: Platform.OS,
      deviceId: __DEV__ ? "__DEV__" : settings.deviceId,
    };

    const body = {
      type: analyticsId,
      emoji,
      comment,
      details: analyticsData,
      ...metaData,
    };

    console.log("Sending statistics feedback", body);

    analytics.track("statistics_feedback", body);

    try {
      const response = await fetch(STATISTICS_FEEDBACK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      onSendDone();
      return response;
    } catch (error) {
      onSendDone();
      throw error;
    }
  };

  const handleFeedback = async (emoji) => {
    if (loading) {
      return;
    }

    setEmojiSelected(emoji);

    if (emoji === emojiSelected) {
      setEmojiSelected(null);
      setShowTextInput(false);
      return;
    }

    if (["👎", "😴"].includes(emoji)) {
      setShowTextInput(true);
    } else {
      send(emoji);
      if ((await StoreReview.hasAction()) && variant === "default") {
        analytics.track("statistics_feedback_store_review_request");
        void (async () => {
          try {
            await StoreReview.requestReview();
            analytics.track("statistics_feedback_store_review_done");
          } catch {
            analytics.track("statistics_feedback_store_review_error");
          }
        })();
      }
    }
  };

  const options =
    variant === "default"
      ? EMOJI_SCALE_IMAGES_DEFAULT
      : EMOJI_SCALE_IMAGES_MINIMAL;

  return (
    <View
      style={{
        flexDirection: "column",
        marginTop: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.cardBorder,
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
        marginBottom: -8,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {!loading && (
          <Text
            style={{
              fontSize: 14,
              color: colors.statisticsFeedbackText,
              paddingTop: 8,
              paddingBottom: 8,
            }}
          >
            {feedbackSent
              ? `🫶 ${t("statistics_feedback_thanks")}`
              : t("statistics_feedback_question")}
          </Text>
        )}
        {loading && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <ActivityIndicator size="small" color={colors.loadingIndicator} />
          </View>
        )}
        {!feedbackSent && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {options.map((emojiScale, index) => (
              <View
                key={`emoji-feedback-${emojiScale.emoji}`}
                style={{
                  marginRight: index === options.length - 1 ? 0 : 8,
                }}
              >
                <CardFeedbackEmoji
                  selected={emojiSelected === emojiScale.emoji}
                  image={
                    emojiSelected === emojiScale.emoji
                      ? emojiScale.active
                      : emojiScale.disabled
                  }
                  onPress={() => handleFeedback(emojiScale.emoji)}
                />
              </View>
            ))}
          </View>
        )}
      </View>
      {showTextInput && !loading && (
        <View
          style={{
            marginTop: 8,
            marginBottom: 16,
          }}
        >
          <TextArea
            placeholder={t("statistics_feedback_placeholder")}
            value={comment}
            onChange={setComment}
            style={{
              paddingTop: 12,
              padding: 12,
              marginTop: 8,
              borderRadius: 8,
              borderColor: colors.textInputBorder || undefined,
              height: 24 * 2,
            }}
          />
          <Button
            onPress={() => send(emojiSelected)}
            style={{
              marginTop: 8,
            }}
          >
            {t("send")}
          </Button>
        </View>
      )}
    </View>
  );
};
