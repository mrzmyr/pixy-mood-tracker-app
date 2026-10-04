import {
  Button,
  Circle,
  Host,
  HStack,
  List,
  RNHostView,
  Group,
  Section,
  SwipeActions,
  Text,
} from "@expo/ui/swift-ui";
import {
  accessibilityHidden,
  accessibilityLabel,
  foregroundStyle,
  frame,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listStyle,
  scrollContentBackground,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useTheme, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import { MAX_TAGS } from "@/constants/Config";
import { t } from "@/lib/translation";
import type { Tag } from "../TagsProvider";
import { useTagActions } from "../useTagActions";

/** Native scrolling tag list; swipe delete waits for confirmation, archive runs immediately. */
export const TagList = ({
  tags,
  header,
  emptyMessage,
}: {
  tags: Tag[];
  header?: React.ReactElement;
  emptyMessage?: string;
}) => {
  const colors = useColors();
  const message = emptyMessage ?? `${t("tags_empty")}. 👻`;
  const { dark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { confirmDelete, archive } = useTagActions();

  return (
    <Host
      style={{ flex: 1, backgroundColor: colors.background }}
      colorScheme={dark ? "dark" : "light"}
      ignoreSafeArea="container"
    >
      <List
        modifiers={[
          listStyle("insetGrouped"),
          scrollContentBackground("hidden"),
        ]}
      >
        {header && (
          <Group
            modifiers={[
              frame({ maxWidth: Infinity, height: 50 }),
              listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }),
              listRowBackground(colors.background),
              listRowSeparator("hidden"),
            ]}
          >
            <RNHostView>{header}</RNHostView>
          </Group>
        )}
        {tags.length >= MAX_TAGS && (
          <Text modifiers={[foregroundStyle(colors.text)]}>
            {t("tags_reached_max", { max_count: MAX_TAGS })}
          </Text>
        )}
        <Section
          footer={
            <Text
              modifiers={[
                frame({ height: insets.bottom + 72 }),
                accessibilityHidden(),
              ]}
            >
              {" "}
            </Text>
          }
        >
          {tags.length === 0 && (
            <Text modifiers={[foregroundStyle(colors.textSecondary)]}>
              {message}
            </Text>
          )}
          {tags.map((tag) => (
            <SwipeActions
              key={tag.id}
              modifiers={[
                listRowBackground(colors.menuListItemBackground),
                // Match MenuListItem: 34 pt content plus 8 pt padding per edge.
                listRowInsets({ top: 8, bottom: 8, leading: 16, trailing: 16 }),
              ]}
            >
              <Button
                onPress={() =>
                  router.push({
                    pathname: "/tags/[id]",
                    params: { id: tag.id },
                  })
                }
                modifiers={[accessibilityLabel(tag.title)]}
              >
                <HStack
                  spacing={16}
                  modifiers={[
                    frame({
                      maxWidth: Infinity,
                      minHeight: 34,
                      alignment: "leading",
                    }),
                  ]}
                >
                  <Circle
                    modifiers={[
                      frame({ width: 10, height: 10 }),
                      foregroundStyle(colors.tags[tag.color].dot),
                    ]}
                  />
                  <Text modifiers={[foregroundStyle(colors.text)]}>
                    {tag.title}
                  </Text>
                </HStack>
              </Button>
              {!tag.isArchived && (
                <SwipeActions.Actions edge="leading">
                  <Button
                    testID={`tag-archive-${tag.id}`}
                    label={t("archive_tag")}
                    systemImage="archivebox"
                    modifiers={[tint(colors.tint)]}
                    onPress={() => archive(tag)}
                  />
                </SwipeActions.Actions>
              )}
              <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
                {/* A destructive role removes SwiftUI rows before confirmation; red tint keeps the row until confirmed. */}
                <Button
                  testID={`tag-delete-${tag.id}`}
                  label={t("delete")}
                  systemImage="trash"
                  modifiers={[tint(colors.palette.red[500])]}
                  onPress={() => {
                    void confirmDelete(tag);
                  }}
                />
              </SwipeActions.Actions>
            </SwipeActions>
          ))}
        </Section>
      </List>
    </Host>
  );
};
