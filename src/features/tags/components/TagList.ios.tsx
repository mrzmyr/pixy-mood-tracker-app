import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import Swipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Archive, Trash2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { TagListContent } from "./TagListContent";
import { TagListItem } from "./TagListItem";
import { useTagActions } from "../useTagActions";

const SwipeableTag = (props: React.ComponentProps<typeof TagListItem>) => {
  const colors = useColors();
  const { confirmDelete, archive } = useTagActions();
  const haptics = useHaptics();
  const [openDirection, setOpenDirection] = useState<SwipeDirection | null>(
    null
  );

  return (
    <Swipeable
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpen={setOpenDirection}
      onSwipeableWillClose={() => setOpenDirection(null)}
      childrenContainerStyle={{
        backgroundColor: colors.menuListItemBackground,
      }}
      renderLeftActions={
        props.tag.isArchived
          ? undefined
          : (_progress, _translation, actions) => (
              <RectButton
                testID={`tag-archive-${props.tag.id}`}
                accessibilityRole="button"
                accessibilityLabel={t("archive_tag")}
                accessible={openDirection === SwipeDirection.RIGHT}
                accessibilityElementsHidden={
                  openDirection !== SwipeDirection.RIGHT
                }
                onPress={() => {
                  actions.close();
                  archive(props.tag);
                }}
                style={{
                  width: 88,
                  backgroundColor: colors.tint,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <Archive size={18} color={colors.palette.white} />
                <Text style={{ color: colors.palette.white, fontSize: 12 }}>
                  {t("archive_tag")}
                </Text>
              </RectButton>
            )
      }
      renderRightActions={(_progress, _translation, actions) => (
        <RectButton
          testID={`tag-delete-${props.tag.id}`}
          accessibilityRole="button"
          accessibilityLabel={t("delete")}
          accessible={openDirection === SwipeDirection.LEFT}
          accessibilityElementsHidden={openDirection !== SwipeDirection.LEFT}
          onPress={() => {
            actions.close();
            void confirmDelete(props.tag);
          }}
          style={{
            width: 88,
            backgroundColor: colors.palette.red[500],
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Trash2 size={18} color={colors.palette.white} />
          <Text style={{ color: colors.palette.white, fontSize: 12 }}>
            {t("delete")}
          </Text>
        </RectButton>
      )}
    >
      <RectButton
        testID={`tag-row-${props.tag.id}`}
        accessible
        accessibilityRole="button"
        accessibilityLabel={props.tag.title}
        onPress={() => {
          void haptics.selection();
          props.onPress();
        }}
      >
        {/* Native gesture buttons keep hit testing aligned with animated rows. */}
        <View pointerEvents="none" accessibilityElementsHidden>
          <TagListItem {...props} />
        </View>
      </RectButton>
    </Swipeable>
  );
};

/** Native gesture swipes keep existing menu rows; SwiftUI List enforces taller rows on iOS 26. */
export const TagList = (
  props: Omit<React.ComponentProps<typeof TagListContent>, "ItemComponent">
) => {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 56 }}
    >
      <TagListContent {...props} ItemComponent={SwipeableTag} />
    </ScrollView>
  );
};
