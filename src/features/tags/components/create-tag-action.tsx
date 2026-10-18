import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/button";
import { MAX_TAGS } from "@/constants/config";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { getTagLimit } from "../tag-limit";
import type { Tag } from "../tags-provider";

/**
 * Bottom bar of the tag screens: the Create Tag button, or a notice in its
 * place once {@link MAX_TAGS} is reached. Pass all tags, archived included;
 * both states read the same {@link getTagLimit}.
 */
export const CreateTagAction = ({ tags }: { tags: readonly Tag[] }) => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reached, archivedCount } = getTagLimit(tags);

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
          <View
            testID="tags-limit-notice"
            accessibilityRole="alert"
            style={{
              flex: 1,
              backgroundColor: colors.cardBackground,
              padding: 16,
              borderRadius: RADIUS.md,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>
              {archivedCount > 0
                ? t("tags_reached_max_archived", { max_count: MAX_TAGS })
                : t("tags_reached_max", { max_count: MAX_TAGS })}
            </Text>
          </View>
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
