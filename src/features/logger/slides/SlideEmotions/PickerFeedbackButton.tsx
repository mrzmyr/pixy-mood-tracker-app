import { useRouter } from "expo-router";
import LinkButton from "@/components/LinkButton";
import { t } from "@/lib/translation";
import type { FeedbackSource } from "@/types/Feedback";

/**
 * Footer link that opens the feedback form for an emotion picker experiment.
 * `source` names the picker, so its feedback can be told apart.
 */
export const PickerFeedbackButton = ({
  source,
}: {
  source: FeedbackSource;
}) => {
  const router = useRouter();

  return (
    <LinkButton
      testID="logger-emotions-feedback"
      type="secondary"
      onPress={() =>
        router.push({
          pathname: "/feedback",
          params: { type: "other", source },
        })
      }
      style={{ fontWeight: "400" }}
    >
      {t("log_emotions_feedback")}
    </LinkButton>
  );
};
