import dayjs from "dayjs";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import { DATE_FORMAT } from "@/constants/Config";
import {
  MAX_PHOTOS_PER_ENTRY,
  PhotoGrid,
  PhotoViewerModal,
  TodayStrip,
  showAddPhotoMenu,
  usePhotoActions,
  useTodayPhotos,
} from "@/features/photos";
import { getLogEditMarginTop } from "@/helpers/responsive";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { LogPhoto } from "@/types";
import { SlideHeadline } from "../components/SlideHeadline";
import { useTemporaryLog } from "../temporaryLog";
import { Footer } from "./Footer";

/**
 * Photos step: photos taken on the entry's day first, one tap each, then
 * the draft grid whose add tile opens the library picker (any day) or the
 * camera. The next button skips the step.
 */
export const SlidePhotos = ({
  mode,
  onChange,
  onDisableStep,
  showDisable,
}: {
  mode: "create" | "edit";
  onChange: (photos: LogPhoto[]) => void;
  onDisableStep: () => void;
  showDisable: boolean;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tempLog = useTemporaryLog();
  const photos = tempLog.data.photos ?? [];
  const date = dayjs(tempLog.data.dateTime).format(DATE_FORMAT);
  const actions = usePhotoActions({ photos, onChange, mode });
  const today = useTodayPhotos({ date, photos, onChange, mode });
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        paddingBottom: insets.bottom + 20,
        marginTop: getLogEditMarginTop(),
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
        {photos.length > 0 && (
          <Text
            testID="photos-count"
            style={{ color: colors.textSecondary, fontSize: 15 }}
          >
            {t("photos_count_of", {
              count: photos.length,
              max: MAX_PHOTOS_PER_ENTRY,
            })}
          </Text>
        )}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, gap: 16 }}
      >
        <TodayStrip {...today} />
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <PhotoGrid
            photos={photos}
            onOpen={setViewerIndex}
            onRemove={(photo) => actions.remove(photo)}
            onAdd={() => {
              if (actions.isAdding || today.isImporting) {
                return;
              }
              showAddPhotoMenu({
                onLibrary: () => {
                  void actions.addFromLibrary();
                },
                onCamera: () => {
                  void actions.addFromCamera();
                },
              });
            }}
          />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t("photos_step_helper", { max: MAX_PHOTOS_PER_ENTRY })}
          </Text>
        </View>
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
        photos={photos}
        initialIndex={viewerIndex ?? 0}
        isVisible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
};
