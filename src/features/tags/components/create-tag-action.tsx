import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { getTagLimit, useMaxTags } from "../tag-limit";
import type { Tag } from "../tags-provider";

/**
 * Notice that replaces Create Tag once {@link useMaxTags} is reached. Pass
 * all tags, archived included.
 */
export const TagLimitNotice = ({ tags }: { tags: readonly Tag[] }) => {
  const colors = useColors();
  const maxTags = useMaxTags();
  const { archivedCount } = getTagLimit(tags, maxTags);

  return (
    <View
      testID="tags-limit-notice"
      accessibilityRole="alert"
      style={{
        flex: 1,
        backgroundColor: colors.cardBackground,
        padding: 16,
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15 }}>
        {archivedCount > 0
          ? t("tags_reached_max_archived", { max_count: maxTags })
          : t("tags_reached_max", { max_count: maxTags })}
      </Text>
    </View>
  );
};

/** `true` while one more tag fits under {@link useMaxTags}. */
export const useCanCreateTag = (tags: readonly Tag[]) =>
  !getTagLimit(tags, useMaxTags()).reached;

/**
 * Bottom bar of the tag screens: the Create Tag button, or a notice in its
 * place once {@link useMaxTags} is reached. Pass all tags, archived included;
 * both states read the same {@link getTagLimit}.
 */
export const CreateTagAction = ({ tags }: { tags: readonly Tag[] }) => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const maxTags = useMaxTags();
  const { reached } = getTagLimit(tags, maxTags);

  return (
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
        {reached ? (
          <TagLimitNotice tags={tags} />
        ) : (
          <Button
            style={{ marginTop: 16, width: "100%" }}
            onPress={() => {
              router.push("/tags/create");
            }}
          >
            {t("create_tag")}
          </Button>
        )}
      </View>
    </>
  );
};
