// oxlint-disable anti-slop/no-shape-in-symbol-names -- Native SwiftUI contentShape and shapes API names.
import {
  Button as NativeButton,
  Host,
  HStack,
  Image,
  List,
  Section,
  Spacer,
  SwipeActions,
  Text,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  listStyle,
  scrollContentBackground,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useRouter, useTheme } from "expo-router";
import { MAX_TAGS } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useTagActions } from "../useTagActions";
import { useTagsState } from "../TagsProvider";
import type { Tag } from "../TagsProvider";

/** Native swipe actions in settings and logger tag manager. Delete always confirms. */
export const TagList = ({
  tags,
  archived = false,
  showArchive = false,
}: {
  tags: Tag[];
  archived?: boolean;
  showArchive?: boolean;
}) => {
  const router = useRouter();
  const { dark } = useTheme();
  const colors = useColors();
  const { tags: totalTags } = useTagsState();
  const { askToDelete, archive } = useTagActions();
  const openEditor = (tag: Tag) => {
    router.push({ pathname: "/tags/[id]", params: { id: tag.id } });
  };
  return (
    <Host
      style={{ flex: 1 }}
      ignoreSafeArea="container"
      colorScheme={dark ? "dark" : "light"}
    >
      <List
        modifiers={[
          listStyle("insetGrouped"),
          scrollContentBackground("hidden"),
        ]}
      >
        {showArchive && (
          <Section>
            <NativeButton
              onPress={() => router.push("/settings/tags/archive")}
              modifiers={[
                buttonStyle("plain"),
                listRowBackground(colors.menuListItemBackground),
              ]}
            >
              <HStack
                spacing={15}
                modifiers={[contentShape(shapes.rectangle())]}
              >
                <Image systemName="archivebox" size={20} color={colors.text} />
                <Text
                  modifiers={[foregroundStyle(colors.text), font({ size: 17 })]}
                >
                  {t("archive_tag")}
                </Text>
                <Spacer />
                <Image
                  systemName="chevron.right"
                  size={14}
                  color={colors.menuListItemIcon}
                />
              </HStack>
            </NativeButton>
          </Section>
        )}
        <Section>
          {tags.length === 0 && (
            <Text
              modifiers={[
                foregroundStyle(colors.textSecondary),
                listRowBackground(colors.menuListItemBackground),
              ]}
            >
              {t(archived ? "tags_archive_empty" : "tags_empty")}
            </Text>
          )}
          {tags.map((tag) => (
            <SwipeActions
              key={tag.id}
              modifiers={[listRowBackground(colors.menuListItemBackground)]}
            >
              <NativeButton
                onPress={() => openEditor(tag)}
                modifiers={[
                  buttonStyle("plain"),
                  accessibilityLabel(tag.title),
                ]}
              >
                <HStack
                  spacing={16}
                  modifiers={[
                    frame({ minHeight: 28 }),
                    contentShape(shapes.rectangle()),
                  ]}
                >
                  <Image
                    systemName="circle.fill"
                    size={10}
                    color={colors.tags[tag.color].dot}
                  />
                  <Text
                    modifiers={[
                      foregroundStyle(colors.text),
                      font({ size: 17 }),
                    ]}
                  >
                    {tag.title}
                  </Text>
                  <Spacer />
                </HStack>
              </NativeButton>
              <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
                {/* Keep row until confirmation; SwiftUI animates destructive buttons as immediate deletion.
                    https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/swipeactions/ */}
                <NativeButton
                  label={t("delete")}
                  systemImage="trash"
                  modifiers={[tint(colors.dangerButtonText)]}
                  onPress={() => askToDelete(tag)}
                />
                {!archived && (
                  <NativeButton
                    label={t("archive_tag")}
                    systemImage="archivebox"
                    modifiers={[tint(colors.tint)]}
                    onPress={() => archive(tag)}
                  />
                )}
              </SwipeActions.Actions>
            </SwipeActions>
          ))}
        </Section>
        {!archived && totalTags.length >= MAX_TAGS && (
          <Section>
            <Text modifiers={[foregroundStyle(colors.text)]}>
              {t("tags_reached_max", { max_count: MAX_TAGS })}
            </Text>
          </Section>
        )}
      </List>
    </Host>
  );
};
