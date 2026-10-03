import dayjs from "dayjs";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import { DATE_FORMAT } from "@/constants/Config";
import {
  AddPhotoTile,
  AttachedTile,
  DayAccessRow,
  MAX_PHOTOS_PER_ENTRY,
  PhotoGrid,
  PhotoViewerModal,
  SuggestionTile,
  useDraftPhotos,
} from "@/features/photos";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { LogPhoto } from "@/types";
import { SlideHeadline } from "../components/SlideHeadline";
import { useTemporaryLog } from "../temporaryLog";
import { Footer } from "./Footer";
import { getSlideMarginTop } from "./marginTop";

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
  return day.format("ddd, MMM D");
};

/**
 * Photos step. Top: the entry's photos after the add tile, which opens the
 * system photo library. A tap on a photo opens the viewer with "Remove";
 * the remove button on the tile removes it at once. Below a divider: the
 * "From Today" section with library photos of the entry's day, or the
 * access row that asks for them. A tap on a suggestion moves it to the
 * top. The next button skips the step.
 */
export const SlidePhotos = ({
  mode,
  isActive,
  onChange,
  onDisableStep,
  showDisable,
}: {
  mode: "create" | "edit";
  /** The step is on screen. */
  isActive: boolean;
  onChange: (photos: LogPhoto[]) => void;
  onDisableStep: () => void;
  showDisable: boolean;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tempLog = useTemporaryLog();
  const storedPhotos = tempLog.data.photos ?? [];
  const date = dayjs(tempLog.data.dateTime).format(DATE_FORMAT);
  const dayTitle = formatDayLabel({ date, isTitleCase: true });
  const draft = useDraftPhotos({
    date,
    photos: storedPhotos,
    onChange,
    mode,
    isActive,
  });
  const [viewerKey, setViewerKey] = useState<string | null>(null);

  const viewerIndex = draft.photos.findIndex(({ key }) => key === viewerKey);
  const isLimited = draft.permission === "limited";
  const hasDaySection =
    draft.isDayAccessPromptVisible ||
    draft.isDayAccessButtonVisible ||
    draft.suggestions.length > 0 ||
    isLimited;

  const removeByKey = (key: string) => {
    const photo = draft.photos.find((candidate) => candidate.key === key);
    if (photo) {
      draft.remove(photo);
    }
  };

  return (
    <View
      testID="slide-photos"
      style={{
        flex: 1,
        width: "100%",
        paddingBottom: insets.bottom + 20,
        marginTop: getSlideMarginTop(),
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
        {draft.count > 0 && (
          <Text
            testID="photos-count"
            accessibilityLiveRegion="polite"
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              fontVariant: ["tabular-nums"],
            }}
          >
            {t("photos_count_of", {
              count: draft.count,
              max: MAX_PHOTOS_PER_ENTRY,
            })}
          </Text>
        )}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          gap: 12,
        }}
      >
        <PhotoGrid testID="photo-grid">
          {(cellSize) => (
            <>
              <AddPhotoTile
                onPress={() => {
                  void draft.addFromLibrary();
                }}
                size={cellSize}
                disabled={draft.isFull || draft.isAddDisabled}
              />
              {draft.photos.map((photo, index) => (
                <AttachedTile
                  key={photo.key}
                  uri={photo.uri}
                  recyclingKey={photo.key}
                  index={index}
                  count={draft.count}
                  size={cellSize}
                  isImporting={photo.isImporting}
                  onOpen={() => setViewerKey(photo.key)}
                  onRemove={() => draft.remove(photo)}
                />
              ))}
            </>
          )}
        </PhotoGrid>
        <Text
          testID="photos-helper"
          style={{ color: colors.textSecondary, fontSize: 13 }}
        >
          {t("photos_step_helper", { max: MAX_PHOTOS_PER_ENTRY })}
        </Text>
        {hasDaySection && (
          <View testID="photos-day-section" style={{ gap: 12 }}>
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.logHeaderBorder,
                marginVertical: 4,
              }}
            />
            <Text
              accessibilityRole="header"
              style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}
            >
              {t("photos_from_day", { day: dayTitle })}
            </Text>
            {draft.isDayAccessPromptVisible && (
              <DayAccessRow
                dayLabel={formatDayLabel({ date, isTitleCase: false })}
                onAllow={() => {
                  void draft.allowDayAccess({ source: "row" });
                }}
                onDismiss={() => draft.dismissDayAccess()}
              />
            )}
            {draft.isDayAccessButtonVisible && (
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
            )}
            {draft.suggestions.length > 0 && (
              <PhotoGrid testID="photo-suggestions">
                {(cellSize) =>
                  draft.suggestions.map((suggestion, index) => (
                    <SuggestionTile
                      key={suggestion.id}
                      uri={suggestion.uri}
                      recyclingKey={suggestion.id}
                      index={index}
                      count={draft.suggestions.length}
                      size={cellSize}
                      isDimmed={draft.isFull}
                      onAdd={() => draft.addSuggestion(suggestion)}
                    />
                  ))
                }
              </PhotoGrid>
            )}
            {isLimited && (
              <Pressable
                testID="photos-manage-access"
                accessibilityRole="button"
                onPress={() => draft.manageDayAccess()}
                style={({ pressed }) => ({
                  alignSelf: "flex-start",
                  minHeight: 44,
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: colors.link, fontSize: 15 }}>
                  {t("photos_manage_access")}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
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
