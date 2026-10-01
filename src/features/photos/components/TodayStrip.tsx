import { Image } from "expo-image";
import { Check, Images } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { useTodayPhotos } from "../hooks/useTodayPhotos";
import type { LibraryPhoto } from "../photoSource";

const TILE_SIZE = 96;
const RING_WIDTH = 3;
const BADGE_SIZE = 24;
// Sits on the photo, not on a themed surface, so it stays the same in both
// color schemes for contrast.
const BADGE_UNSELECTED_BACKGROUND = "rgba(0, 0, 0, 0.3)";
const BADGE_UNSELECTED_BORDER = "white";
const MIN_TARGET = 44;

const PermissionCard = ({ onAllow }: { onAllow: () => void }) => {
  const colors = useColors();

  return (
    <View
      testID="photos-today-permission"
      style={{
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.cardBackground,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Images color={colors.text} size={24} />
        <Text
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 17,
            fontWeight: "600",
          }}
        >
          {t("photos_today_title")}
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
        {t("photos_today_body")}
      </Text>
      <Button testID="photos-today-allow" onPress={onAllow}>
        {t("photos_today_allow")}
      </Button>
    </View>
  );
};

const TodayTile = ({
  photo,
  index,
  count,
  isSelected,
  onPress,
}: {
  photo: LibraryPhoto;
  index: number;
  count: number;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const position = index + 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={t("photos_today_photo_label", {
        index: position,
        count,
      })}
      accessibilityState={{ selected: isSelected }}
      testID={`photos-today-${position}`}
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <Image
        source={{ uri: photo.uri }}
        style={{ flex: 1 }}
        contentFit="cover"
        recyclingKey={photo.id}
      />
      {isSelected && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: 12,
            borderWidth: RING_WIDTH,
            borderColor: colors.checkboxCheckedBackground,
          }}
        />
      )}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: isSelected ? 0 : 1.5,
          borderColor: BADGE_UNSELECTED_BORDER,
          backgroundColor: isSelected
            ? colors.checkboxCheckedBackground
            : BADGE_UNSELECTED_BACKGROUND,
        }}
      >
        {isSelected && (
          <Check color={colors.checkboxCheckedText} size={16} strokeWidth={3} />
        )}
      </View>
    </Pressable>
  );
};

/**
 * Photos of the entry's day above the photos step grid. Before permission:
 * a card whose button shows the system dialog. After a denial, or when the
 * day has no photos under full access: nothing. Under limited access: the
 * accessible photos and a "Manage" link, also when none are from this day.
 */
export const TodayStrip = ({
  permission,
  photos,
  selectedIds,
  toggle,
  allow,
  manage,
}: ReturnType<typeof useTodayPhotos>) => {
  const colors = useColors();

  if (permission === "undetermined") {
    return (
      <PermissionCard
        onAllow={() => {
          void allow();
        }}
      />
    );
  }

  const isLimited = permission === "limited";
  if (!isLimited && (permission !== "granted" || photos.length === 0)) {
    return null;
  }

  return (
    <View testID="photos-today-strip">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          minHeight: MIN_TARGET,
        }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {t("photos_today_label")}
        </Text>
        {isLimited && (
          <LinkButton
            testID="photos-today-manage"
            onPress={manage}
            style={{ minHeight: MIN_TARGET, paddingHorizontal: 0 }}
          >
            {t("photos_today_manage")}
          </LinkButton>
        )}
      </View>
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
        >
          {photos.map((photo, index) => (
            <TodayTile
              key={photo.id}
              photo={photo}
              index={index}
              count={photos.length}
              isSelected={selectedIds.has(photo.id)}
              onPress={() => toggle(photo)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};
