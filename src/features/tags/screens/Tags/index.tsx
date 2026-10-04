import { useRouter } from "expo-router";
import useColors from "@/hooks/useColors";
import { useTagsState } from "../../TagsProvider";
import type { Tag } from "../../TagsProvider";

import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import ModalHeader from "@/components/ModalHeader";
import { TagList } from "../../components/TagList";
import { MAX_TAGS } from "@/constants/Config";
import { t } from "@/lib/translation";
import { LinearGradient } from "expo-linear-gradient";
import { Archive } from "lucide-react-native";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Tag manager modal opened from the logger's tag slide. Archived tags are
 * hidden here, behind the archive link, but still count toward
 * {@link MAX_TAGS}.
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
      <ScrollView
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            marginTop: 16,
            marginHorizontal: 16,
          }}
        >
          <MenuList>
            <MenuListItem
              title={t("archive_tag")}
              iconLeft={<Archive size={20} color={colors.text} />}
              isLink
              isLast
              onPress={() => {
                router.push("/tags/archive");
              }}
            />
          </MenuList>
        </View>
        <TagList tags={_tags} />
        <View
          style={{
            width: "100%",
            height: insets.bottom + 56,
          }}
        />
      </ScrollView>
    </View>
  );
};
