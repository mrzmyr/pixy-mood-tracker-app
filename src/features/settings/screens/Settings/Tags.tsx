import { useRouter } from "expo-router";
import { TagList, useTagsState, TagListItem } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/useColors";

import Button from "@/components/Button";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { MAX_TAGS } from "@/constants/Config";
import { t } from "@/lib/translation";
import { LinearGradient } from "expo-linear-gradient";
import sortBy from "lodash/sortBy";
import { Archive } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StepSwitch } from "../../components/StepSwitch";
import { useStepEnabled } from "../../useStepEnabled";

/**
 * Settings > Check-in > Tags: the step switch, then active tags and a link
 * to archived ones while the step is on. Archived tags still count toward
 * {@link MAX_TAGS}.
 */
export const SettingsTags = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState();
  const { enabled } = useStepEnabled("tags");

  const _tags = tags.filter((tag: Tag) => !tag.isArchived);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {enabled && tags.length < MAX_TAGS && (
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
      <ScrollView>
        <StepSwitch step="tags" />
        {enabled && (
          <>
            <View
              style={{
                marginTop: 16,
                marginHorizontal: 16,
              }}
            >
              <MenuList style={{}}>
                <MenuListItem
                  title={t("archive_tag")}
                  iconLeft={<Archive size={20} color={colors.text} />}
                  isLink
                  isLast
                  onPress={() => {
                    router.push("/settings/steps/tags/archive");
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
          </>
        )}
      </ScrollView>
    </View>
  );
};

/** Archived tags, sorted by title; rows open the tag editor to unarchive. */
export const SettingsTagsArchive = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState();

  const _tags = sortBy(
    tags.filter((tag: Tag) => tag.isArchived),
    "title"
  );

  const onEdit = (tag: Tag) => {
    router.push({ pathname: "/tags/[id]", params: { id: tag.id } });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            paddingTop: 16,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {_tags.length < 1 && (
            <View
              style={{
                padding: 32,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                }}
              >
                {t("tags_archive_empty")}
              </Text>
            </View>
          )}
          <MenuList
            style={{
              marginBottom: 40,
            }}
          >
            {_tags.map((tag, index) => (
              <TagListItem
                key={tag.id}
                tag={tag}
                isLast={index === _tags.length - 1}
                onPress={() => onEdit(tag)}
              />
            ))}
          </MenuList>
        </View>
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
