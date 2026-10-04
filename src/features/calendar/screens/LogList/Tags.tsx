import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { useTagsState } from "@/features/tags";
import { useRouter } from "expo-router";
import { t } from "@/lib/translation";
import { Text, View, useColorScheme } from "react-native";
import type { ViewStyle } from "react-native";

import { SectionHeader } from "./SectionHeader";

const DEFAULT_STYLE = {};

const Tag = ({
  title,
  colorName,
  style = DEFAULT_STYLE,
}: {
  title: string;
  colorName: string;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const colorScheme = useColorScheme();

  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        borderRadius: 100,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: colors.tagBackground,
        borderColor:
          colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        ...style,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 8,
          marginRight: 10,
          backgroundColor: colors.tags[colorName]?.dot,
        }}
      />
      <Text
        style={{
          color: colors.tagText,
          fontSize: 17,
        }}
      >
        {title}
      </Text>
    </View>
  );
};

/**
 * Tags section of an entry card; editing opens the logger at the tags
 * step. Tag references without a matching tag are skipped. Stored tags
 * always show, also with the pencil off.
 */
export const Tags = ({
  item,
  canEdit,
}: {
  item: LogItem;
  /** Shows the pencil; off when the edit logger has no tags step. */
  canEdit: boolean;
}) => {
  const colors = useColors();
  const { tags } = useTagsState();
  const router = useRouter();

  return (
    <View style={{}}>
      <SectionHeader
        title={t("tags")}
        editTestID="log-list-tags-edit"
        onEdit={
          canEdit
            ? () => {
                router.push({
                  pathname: "/logs/[id]/edit",
                  params: {
                    id: item.id,
                    step: "tags",
                  },
                });
              }
            : undefined
        }
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        {item && item.tags.length > 0 ? (
          item.tags.map((tag) => {
            const _tag = tags.find((knownTag) => knownTag.id === tag.id);

            if (!_tag) {
              return null;
            }

            return (
              <Tag
                key={tag.id}
                title={_tag.title}
                colorName={_tag.color}
                style={{
                  backgroundColor: colors.entryBackground,
                  borderColor: colors.entryItemBorder,
                }}
              />
            );
          })
        ) : (
          <View
            style={{
              paddingTop: 4,
              paddingBottom: 8,
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 17 }}>
              {t("view_log_tags_empty")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
