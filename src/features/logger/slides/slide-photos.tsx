import dayjs from "dayjs";
import Images from "lucide-react-native/icons/images";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import { ButtonIcon, ButtonText } from "@/components/button-content";
import LinkButton from "@/components/link-button";
import {
  AddPhotoTile,
  MAX_PHOTOS_PER_ENTRY,
  PhotoGrid,
  PhotoLimitNotice,
  PhotosPromptCard,
  PickTile,
  useDraftPhotos,
} from "@/features/photos";
import { PhotoViewerModal } from "@/features/photos/routes";
import useColors from "@/hooks/use-colors";
import { toLogDate } from "@/lib/log-dates";
import { t } from "@/lib/translation";
import { formatLocalizedDay } from "@/lib/utils";
import { SlideHeadline } from "../components/slide-headline";
import { useLogDraft } from "../log-draft";
import { Footer } from "./footer";
import { PhotosDayState } from "./photos-day-state";
import { useSlideMarginTop } from "./margin-top";
import { RADIUS } from "@/constants/radius";

/**
 * "today", "yesterday", or a short date such as "Wed, Sep 30". With
 * `isTitleCase`: "Today" and "Yesterday", for headings and buttons.
 */
const formatDayLabel = ({
  date,
  isTitleCase,
}: {
  date: string;
  isTitleCase: boolean;
}) => {
  const day = dayjs(date);
  if (day.isSame(dayjs(), "day")) {
    return t(isTitleCase ? "photos_day_today_title" : "photos_day_today");
  }
  if (day.isSame(dayjs().subtract(1, "day"), "day")) {
    return t(
      isTitleCase ? "photos_day_yesterday_title" : "photos_day_yesterday"
    );
  }
  return formatLocalizedDay(date, "short");
};

/**
 * Photos step, "pick in place": one grid of photos that check and uncheck
 * in place, like the system photo picker. The badge number is the photo's
 * position in the entry. A long press on a checked photo opens the viewer
 * with "Remove". "0 of 6" always shows, so the limit is clear up front; at
 * the limit a check shows a notice that explains the swap.
 *
 * iOS: library photos of the entry's day fill the grid, library picks join
 * it at the start with a "Library" tag. Cards cover the access states: not
 * asked, off, no photos of the day. Limited access ends the grid with
 * "More Photos…".
 *
 * Android: Google Play allows no broad photo access for Pixy, so there are
 * no photos of the day (`unavailable`). A card opens the system Photo
 * Picker; picks fill the same grid, "More…" at its end opens the picker
 * again. The next button skips the step.
 */
export const SlidePhotos = ({
  mode,
  isActive,
  onDisableStep,
  showDisable,
}: {
  mode: "create" | "edit";
  /** The step is on screen. */
  isActive: boolean;
  onDisableStep: () => void;
  showDisable: boolean;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const marginTop = useSlideMarginTop();
  const { draft: logDraft, setPhotos } = useLogDraft();
  const date = toLogDate(logDraft.dateTime);
  const dayTitle = formatDayLabel({ date, isTitleCase: true });
  const draft = useDraftPhotos({
    date,
    photos: logDraft.photos,
    onChange: setPhotos,
    mode,
    isActive,
  });
  const [viewerKey, setViewerKey] = useState<string | null>(null);

  const viewerIndex = draft.photos.findIndex(({ key }) => key === viewerKey);
  const { permission } = draft;
  const isAndroid = permission === "unavailable";
  const hasDayGrid = permission === "granted" || permission === "limited";
  const isLimited = permission === "limited";
  const hasLibraryTag = hasDayGrid && draft.dayPhotoCount > 0;

  const removeByKey = (key: string) => {
    const photo = draft.photos.find((candidate) => candidate.key === key);
    if (photo) {
      draft.remove(photo);
    }
  };

  const addFromLibrary = () => {
    void draft.addFromLibrary();
  };

  const renderTiles = (cellSize: number) =>
    draft.items.map((item, index) => (
      <PickTile
        key={item.key}
        uri={item.uri}
        recyclingKey={item.key}
        position={index + 1}
        count={draft.items.length}
        order={item.order}
        tag={
          hasLibraryTag && item.kind === "library"
            ? t("photos_library_tag")
            : undefined
        }
        size={cellSize}
        isDimmed={draft.isFull}
        isImporting={item.isImporting}
        onToggle={() => draft.toggle(item.key)}
        onOpen={() => {
          const photo =
            item.order === null ? undefined : draft.photos[item.order - 1];
          if (photo) {
            setViewerKey(photo.key);
          }
        }}
      />
    ));

  const renderAndroid = () => {
    if (draft.items.length === 0) {
      return (
        <PhotosPromptCard
          testID="photos-choose"
          hasPreview
          title={t("photos_choose_title")}
          body={t("photos_choose_body", { max: MAX_PHOTOS_PER_ENTRY })}
          actionLabel={t("photos_choose_button")}
          onAction={addFromLibrary}
        />
      );
    }
    return (
      <PhotoGrid testID="photo-grid">
        {(cellSize) => (
          <>
            {renderTiles(cellSize)}
            <AddPhotoTile
              label={t("photos_more")}
              onPress={addFromLibrary}
              size={cellSize}
              disabled={draft.isAddDisabled}
            />
          </>
        )}
      </PhotoGrid>
    );
  };

  const renderIos = () => (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}
        >
          {t("photos_from_day", { day: dayTitle })}
        </Text>
        <Button
          type="secondary"
          testID="photos-library-button"
          onPress={addFromLibrary}
          disabled={draft.isAddDisabled}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: RADIUS.full,
            minHeight: 44,
          }}
        >
          <ButtonIcon icon={Images} size={18} />
          <ButtonText>{t("photos_library_button")}</ButtonText>
        </Button>
      </View>
      {(draft.items.length > 0 || isLimited) && (
        <PhotoGrid testID="photo-grid">
          {(cellSize) => (
            <>
              {renderTiles(cellSize)}
              {isLimited && (
                <AddPhotoTile
                  testID="photos-more-access"
                  label={t("photos_more_access")}
                  onPress={() => draft.manageDayAccess()}
                  size={cellSize}
                />
              )}
            </>
          )}
        </PhotoGrid>
      )}
      <PhotosDayState
        draft={draft}
        dayTitle={dayTitle}
        dayLabel={formatDayLabel({ date, isTitleCase: false })}
      />
    </>
  );

  return (
    <View
      testID="slide-photos"
      style={{
        flex: 1,
        width: "100%",
        paddingBottom: insets.bottom + 20,
        marginTop,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
        }}
      >
        <SlideHeadline>{t("log_photos_question")}</SlideHeadline>
        <Text
          testID="photos-count"
          accessibilityLiveRegion="polite"
          style={{
            color: draft.isFull ? colors.text : colors.textSecondary,
            fontSize: 15,
            fontWeight: draft.isFull ? "600" : "400",
            fontVariant: ["tabular-nums"],
          }}
        >
          {t("photos_count_of", {
            count: draft.count,
            max: MAX_PHOTOS_PER_ENTRY,
          })}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: 16,
            paddingHorizontal: 20,
            paddingBottom: 16,
            gap: 12,
          }}
        >
          {/* Unknown until the permission read: no layout to flash. */}
          {permission !== null && (
            <>
              {isAndroid ? renderAndroid() : renderIos()}
              <Text
                testID="photos-helper"
                style={{ color: colors.textSecondary, fontSize: 13 }}
              >
                {t(isAndroid ? "photos_choose_helper" : "photos_step_helper")}
              </Text>
            </>
          )}
        </ScrollView>
        <PhotoLimitNotice
          isVisible={draft.isLimitNoticeVisible}
          onHide={() => draft.hideLimitNotice()}
          bottom={8}
        />
      </View>
      <Footer style={{ paddingHorizontal: 20 }}>
        {showDisable && (
          <LinkButton
            type="secondary"
            onPress={onDisableStep}
            style={{
              fontWeight: "400",
            }}
          >
            {t("log_photos_disable")}
          </LinkButton>
        )}
      </Footer>
      <PhotoViewerModal
        items={draft.photos.map(({ key, uri }) => ({ key, uri }))}
        initialIndex={Math.max(viewerIndex, 0)}
        context="logger"
        isVisible={viewerIndex !== -1}
        onClose={() => setViewerKey(null)}
        onRemove={({ key }) => {
          removeByKey(key);
          setViewerKey(null);
        }}
      />
    </View>
  );
};
