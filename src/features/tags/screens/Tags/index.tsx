import { useRouter } from "expo-router";
import useColors from "@/hooks/useColors";
import { useTagsState } from "../../TagsProvider";
import type { Tag } from "../../TagsProvider";

import { CloseButton } from "@/components/CloseButton";
import ModalHeader from "@/components/ModalHeader";
import { CreateTagAction } from "../../components/CreateTagAction";
import { TagList } from "../../components/TagList";
import { t } from "@/lib/translation";
import _ from "lodash";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TagScrollView = Platform.OS === "ios" ? View : ScrollView;

/**
 * Tag manager modal opened from the logger's tag slide. Archived tags are
 * hidden here but still count toward `MAX_TAGS`.
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
      <CreateTagAction tags={tags} />
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
