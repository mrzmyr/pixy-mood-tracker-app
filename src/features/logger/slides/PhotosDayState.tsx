import { Linking, Text } from "react-native";
import LinkButton from "@/components/LinkButton";
import { PhotosPromptCard } from "@/features/photos";
import type { useDraftPhotos } from "@/features/photos";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/**
 * Below the photos step grid on iOS: why photos of the entry's day are
 * missing, and the way to get them. Not asked: a card with a preview row,
 * "Show Photos from …" and "Not Now". After "Not Now": a button. Access
 * off: a card with "Open Settings". Access on, no photos that day: a card
 * that points to the library. Renders nothing while photos of the day show.
 */
export const PhotosDayState = ({
  draft,
  dayTitle,
  dayLabel,
}: {
  draft: ReturnType<typeof useDraftPhotos>;
  /** "Today", "Yesterday", or a short date. */
  dayTitle: string;
  /** "today", "yesterday", or a short date. */
  dayLabel: string;
}) => {
  const colors = useColors();

  if (draft.isDayAccessPromptVisible) {
    return (
      <PhotosPromptCard
        testID="photos-day-access"
        hasPreview
        title={t("photos_day_access_title", { day: dayTitle })}
        body={t("photos_day_access_body")}
        actionLabel={t("photos_day_access_button", { day: dayTitle })}
        onAction={() => {
          void draft.allowDayAccess({ source: "card" });
        }}
        secondaryLabel={t("photos_day_access_dismiss")}
        onSecondary={() => draft.dismissDayAccess()}
      />
    );
  }
  if (draft.isDayAccessButtonVisible) {
    return (
      <LinkButton
        testID="photos-day-access-button"
        onPress={() => {
          void draft.allowDayAccess({ source: "button" });
        }}
        style={{
          alignSelf: "flex-start",
          minHeight: 44,
          paddingHorizontal: 0,
        }}
      >
        <Text style={{ color: colors.link, fontSize: 15 }}>
          {t("photos_day_access_button", { day: dayTitle })}
        </Text>
      </LinkButton>
    );
  }
  if (draft.permission === "denied") {
    return (
      <PhotosPromptCard
        testID="photos-access-off"
        title={t("photos_access_off_title")}
        body={t("photos_access_off_body", { day: dayLabel })}
        actionLabel={t("photos_open_settings")}
        onAction={() => {
          void Linking.openSettings();
        }}
      />
    );
  }
  if (draft.permission === "granted" && draft.dayPhotoCount === 0) {
    return (
      <PhotosPromptCard
        testID="photos-day-empty"
        title={t("photos_day_empty_title", { day: dayTitle })}
        body={t("photos_day_empty_body")}
      />
    );
  }
  return null;
};
