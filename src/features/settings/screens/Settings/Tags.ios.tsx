import { useRouter } from "expo-router";
import sortBy from "lodash/sortBy";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import { MAX_TAGS } from "@/constants/Config";
import { TagList, useTagsState } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

const TagSettings = ({ archived = false }: { archived?: boolean }) => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState();
  let visibleTags = tags.filter((tag) => Boolean(tag.isArchived) === archived);
  if (archived) {
    visibleTags = sortBy(visibleTags, "title");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TagList tags={visibleTags} archived={archived} showArchive={!archived} />
      {!archived && tags.length < MAX_TAGS && (
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

/** Native tag settings list with immediate archive and confirmed delete swipe actions. */
export const SettingsTags = () => <TagSettings />;

/** Native archived tag list. Delete confirms; tapping opens editor to restore. */
export const SettingsTagsArchive = () => <TagSettings archived />;
