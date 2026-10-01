import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Camera, Image } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import {
  MAX_PHOTOS_PER_ENTRY,
  PhotoGrid,
  PhotoViewerModal,
  showAddPhotoMenu,
  usePhotoActions,
} from "@/features/photos";
import { getLogEditMarginTop } from "@/helpers/responsive";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { SlideHeadline } from "../components/SlideHeadline";
import { useTemporaryLog } from "../temporaryLog";
import { Footer } from "./Footer";

const BUTTON_HEIGHT = 56;
const ICON_SIZE = 22;

/**
 * Photos slide. Without photos it shows separate library and camera
 * buttons; with photos a grid whose add tile opens the source menu. The
 * step is optional: the next button always shows and skips it.
 */
export const SlidePhotos = ({
  mode,
  onDisableStep,
  showDisable,
}: {
  mode: "create" | "edit";
  onDisableStep: () => void;
  showDisable: boolean;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tempLog = useTemporaryLog();
  const { photos } = tempLog.data;
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { addFromLibrary, addFromCamera, remove, isAdding } = usePhotoActions({
    photos,
    onChange: (next) => tempLog.update({ photos: next }),
    mode,
  });

  const marginTop = getLogEditMarginTop();
  const hasPhotos = photos.length > 0;

  return (
    <View
      testID="logger-photos"
      style={{
        flex: 1,
        width: "100%",
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
        marginTop,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <SlideHeadline style={{ flexShrink: 1 }}>
          {t("log_photos_question")}
        </SlideHeadline>
        {hasPhotos && (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              fontVariant: ["tabular-nums"],
            }}
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
        contentContainerStyle={{ paddingTop: 24 }}
      >
        {hasPhotos ? (
          <PhotoGrid
            photos={photos}
            onOpen={setViewerIndex}
            onAdd={() => {
              showAddPhotoMenu({
                onLibrary: addFromLibrary,
                onCamera: addFromCamera,
              });
            }}
            onRemove={(photo) => remove({ id: photo.id })}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Button
              type="primary"
              testID="photos-choose-library"
              disabled={isAdding}
              onPress={addFromLibrary}
              icon={
                <Image
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  color={colors.primaryButtonText}
                />
              }
              style={{ minHeight: BUTTON_HEIGHT }}
            >
              {t("photos_choose_library")}
            </Button>
            <Button
              type="secondary"
              testID="photos-take-photo"
              disabled={isAdding}
              onPress={addFromCamera}
              icon={
                <Camera
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  color={colors.secondaryButtonText}
                />
              }
              style={{ minHeight: BUTTON_HEIGHT }}
            >
              {t("photos_take_photo")}
            </Button>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              {t("log_photos_helper", { max: MAX_PHOTOS_PER_ENTRY })}
            </Text>
          </View>
        )}
      </ScrollView>
      <Footer>
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
