import { useRouter } from "expo-router";
import useColors from "@/hooks/useColors";
import { useTagsState } from "../../TagsProvider";
import type { Tag } from "../../TagsProvider";

import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import { TagList } from "../../components/TagList";
import { MAX_TAGS } from "@/constants/Config";
import { t } from "@/lib/translation";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
          <LinkButton
            onPress={() => {
              router.back();
            }}
            type="primary"
          >
            {t("done")}
          </LinkButton>
        }
      />
      <TagList tags={_tags} />
      {tags.length < MAX_TAGS && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <Button onPress={() => router.push("/tags/create")}>
            {t("create_tag")}
          </Button>
        </View>
      )}
    </View>
  );
};
