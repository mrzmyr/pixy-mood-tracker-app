import { useState } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import Swipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Archive from "lucide-react-native/icons/archive";
import Trash from "lucide-react-native/icons/trash";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { TagListItem } from "./tag-list-item";
import { useTagActions } from "../use-tag-actions";

/** Tag row with native swipe actions: archive (right swipe) and delete (left swipe). */
export const TagRow = ({
  dragHandle,
  ...props
}: React.ComponentProps<typeof TagListItem> & {
  /** Reorder control, drawn over the row's trailing edge. */
  dragHandle?: ReactNode;
}) => {
  const colors = useColors();
  const { confirmDelete, archive } = useTagActions();
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
            backgroundColor: colors.danger,
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Trash size={18} color={colors.palette.white} />
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
        // Swipe actions stay hidden until the row opens, so screen readers get them here.
        accessibilityActions={[
          ...(props.tag.isArchived
            ? []
            : [{ name: "archive", label: t("archive_tag") }]),
          { name: "delete", label: t("delete") },
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === "archive") {
            archive(props.tag);
          }
          if (nativeEvent.actionName === "delete") {
            void confirmDelete(props.tag);
          }
        }}
        onPress={() => {
          props.onPress();
        }}
      >
        {/* Native gesture buttons keep hit testing aligned with animated rows. */}
        <View pointerEvents="none" accessibilityElementsHidden>
          <TagListItem {...props} />
        </View>
      </RectButton>
      {dragHandle && (
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0 }}>
          {dragHandle}
        </View>
      )}
    </Swipeable>
  );
};
