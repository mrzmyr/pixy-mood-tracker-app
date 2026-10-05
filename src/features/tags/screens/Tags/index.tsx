import { useRouter } from "expo-router";
import useColors from "@/hooks/useColors";
import { useTagsState } from "../../TagsProvider";
import type { Tag } from "../../TagsProvider";

import Button from "@/components/Button";
import { CloseButton } from "@/components/CloseButton";
import ModalHeader from "@/components/ModalHeader";
import { TagList } from "../../components/TagList";
import { MAX_TAGS } from "@/constants/Config";
import { t } from "@/lib/translation";
import { LinearGradient } from "expo-linear-gradient";
import _ from "lodash";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TagScrollView = Platform.OS === "ios" ? View : ScrollView;

/**
 * Tag manager modal opened from the logger's tag slide. Archived tags are
 * hidden here but still count toward {@link MAX_TAGS}.
 */
export const Tags = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState();

  const _tags = tags.filter((tag: Tag) => !tag.isArchived);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-start",
        backgroundColor: colors.background,
        marginTop: Platform.OS === "android" ? insets.top : 0,
      }}
    >
      <ModalHeader
        title={t("tags")}
        right={
          <CloseButton testID="tags-close" onPress={() => router.back()} />
        }
      />
      {tags.length < MAX_TAGS && (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={[
              colors.logBackgroundTransparent,
              colors.background,
              colors.background,
            ]}
            style={{
              position: "absolute",
              height: 120 + insets.bottom,
              bottom: 0,
              zIndex: 1,
              width: "100%",
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 16,
              position: "absolute",
              bottom: insets.bottom + 16,
              width: "100%",
              zIndex: 2,
            }}
          >
            <Button
              style={{
                marginTop: 16,
                width: "100%",
              }}
              onPress={() => {
                router.push("/tags/create");
              }}
            >
              {t("create_tag")}
            </Button>
          </View>
        </>
      )}
      <TagScrollView
        style={{
          flex: 1,
        }}
      >
        <TagList tags={_tags} />
        {Platform.OS !== "ios" && (
          <View style={{ height: insets.bottom + 56 }} />
        )}
      </TagScrollView>
    </View>
  );
};
