import dayjs from "dayjs";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import { DATE_FORMAT } from "@/constants/Config";
import {
  DayAccessRow,
  MAX_PHOTOS_PER_ENTRY,
  PhotoGrid,
  PhotoViewerModal,
  showAddPhotoMenu,
  usePhotoSelection,
} from "@/features/photos";
import type { PhotoTile } from "@/features/photos";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { LogPhoto } from "@/types";
import { SlideHeadline } from "../components/SlideHeadline";
import { useTemporaryLog } from "../temporaryLog";
import { Footer } from "./Footer";
import { getSlideMarginTop } from "./marginTop";

/** "today", "yesterday", or a short date such as "Wed, Sep 30". */
const formatDayLabel = ({ date }: { date: string }) => {
  const day = dayjs(date);
  if (day.isSame(dayjs(), "day")) {
    return t("photos_day_today");
  }
  if (day.isSame(dayjs().subtract(1, "day"), "day")) {
    return t("photos_day_yesterday");
  }
  return day.format("ddd, MMM D");
};

/**
 * Photos step: one grid with the add tile first, then added photos, then
 * library photos of the entry's day. Every tile toggles selection on tap
 * and opens the viewer on long press once imported. The next button skips
 * the step.
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
  const photos = tempLog.data.photos ?? [];
  const date = dayjs(tempLog.data.dateTime).format(DATE_FORMAT);
  const dayLabel = formatDayLabel({ date });
  const selection = usePhotoSelection({
    date,
    photos,
    onChange,
    mode,
    isActive,
  });
  const [viewerKey, setViewerKey] = useState<string | null>(null);

  const viewerTiles = selection.tiles.filter(
    (tile): tile is PhotoTile & { photo: LogPhoto } => tile.photo !== null
  );
  const viewerIndex = viewerTiles.findIndex(({ key }) => key === viewerKey);

  const openAddMenu = () => {
    if (selection.isPicking) {
      return;
    }
    showAddPhotoMenu({
      onLibrary: () => {
        void selection.addFromLibrary();
      },
      onCamera: () => {
        void selection.addFromCamera();
      },
      dayAccess: selection.isDayAccessMenuVisible
        ? {
            label: t("photos_day_access_menu", { day: dayLabel }),
            onPress: () => {
              void selection.allowDayAccess({ source: "menu" });
            },
          }
        : undefined,
    });
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
        {selection.selectedCount > 0 && (
          <Text
            testID="photos-count"
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              fontVariant: ["tabular-nums"],
            }}
          >
            {t("photos_count_of", {
              count: selection.selectedCount,
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
          gap: 12,
        }}
      >
        {selection.isDayAccessPromptVisible && (
          <DayAccessRow
            dayLabel={dayLabel}
            onAllow={() => {
              void selection.allowDayAccess({ source: "row" });
            }}
            onDismiss={() => selection.dismissDayAccess()}
          />
        )}
        <PhotoGrid
          tiles={selection.tiles}
          isFull={selection.isFull}
          isAddDisabled={selection.isPicking}
          onAdd={openAddMenu}
          onToggle={(tile) => selection.toggle(tile)}
          onOpen={(tile) => setViewerKey(tile.key)}
        />
        <Text
          testID="photos-helper"
          style={{ color: colors.textSecondary, fontSize: 13 }}
        >
          {t("photos_step_helper", { max: MAX_PHOTOS_PER_ENTRY })}
          {selection.permission === "limited" && (
            <>
              {" "}
              <Text
                testID="photos-manage-access"
                accessibilityRole="link"
                onPress={() => selection.manageDayAccess()}
                style={{ color: colors.link }}
              >
                {t("photos_manage_access")}
              </Text>
            </>
          )}
        </Text>
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
        photos={viewerTiles.map(({ photo }) => photo)}
        initialIndex={Math.max(viewerIndex, 0)}
        context="logger"
        isVisible={viewerIndex !== -1}
        onClose={() => setViewerKey(null)}
      />
    </View>
  );
};
