import Button from "@/components/button";
import { ButtonIcon } from "@/components/button-content";
import LinkButton from "@/components/link-button";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";
import { t } from "@/lib/translation";
import dayjs from "dayjs";
import { ScrollView, Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/use-colors";
import { useScrollBottomPadding } from "@/hooks/use-scroll-bottom-padding";
import { useLogState } from "@/features/logs";
import { useSettings } from "@/state/settings";
import { useTagsState } from "@/features/tags";
import { IS_WIDGET_SUPPORTED, getWidgetSyncStatus } from "@/features/widget";
import Trash from "lucide-react-native/icons/trash";
import { getWordCount } from "@/lib/utils";
import { usePostHog } from "posthog-react-native";
import { RADIUS } from "@/constants/radius";

const Card = ({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        padding: 16,
        flex: 1,
        height: "100%",
        ...style,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: colors.text,
          marginBottom: 8,
        }}
      >
        {children}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "bold",
          color: colors.textSecondary,
        }}
      >
        {title}
      </Text>
    </View>
  );
};

/**
 * Settings > Development statistics: usage totals plus the list of
 * completed one-time actions (promos, questions, onboarding), which can be
 * removed to show them again. Reachable in release builds too.
 */
export const DevelopmentTools = () => {
  const colors = useColors();
  const logState = useLogState();
  const { tags } = useTagsState();
  const { settings, setSettings, removeActionDone } = useSettings();
  const posthog = usePostHog();
  const paddingBottom = useScrollBottomPadding(16);

  const words_total = logState.items
    .map((d) => getWordCount(d.message))
    .reduce((a, b) => a + b, 0);
  const widgetSync = getWidgetSyncStatus();
  let widgetSyncText = "No sync yet";
  if (widgetSync) {
    widgetSyncText = `${widgetSync.status} ${dayjs(widgetSync.at).format("LT")}`;
    if (widgetSync.why) {
      widgetSyncText = `${widgetSyncText}: ${widgetSync.why}`;
    }
  }

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Card
            title={t("development_statistics_days_logged")}
            style={{
              marginRight: 16,
            }}
          >
            {logState.items.length}
          </Card>
          <Card title={t("development_statistics_words_total")}>
            {words_total}
          </Card>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <Card
            title={t("development_statistics_tags_unique")}
            style={{
              marginRight: 16,
            }}
          >
            {tags?.length}
          </Card>
          <Card title={t("development_statistics_days_tagged")}>
            {logState.items.filter((d) => d.tags.length > 0).length}
          </Card>
        </View>
        <MenuListHeadline>Device Information</MenuListHeadline>
        <MenuList>
          <MenuListItem>
            <View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  marginTop: 4,
                }}
              >
                Device ID
              </Text>
              <Text
                selectable
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {settings.deviceId}
              </Text>
            </View>
          </MenuListItem>
          <MenuListItem>
            <View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                  marginTop: 4,
                }}
              >
                PostHog Distinct ID
              </Text>
              <Text
                selectable
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {posthog?.getDistinctId() ?? "-"}
              </Text>
            </View>
          </MenuListItem>
        </MenuList>
        {IS_WIDGET_SUPPORTED && (
          <>
            <MenuListHeadline>Widgets</MenuListHeadline>
            <MenuList>
              <MenuListItem>
                <View>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      marginTop: 4,
                    }}
                  >
                    Last sync
                  </Text>
                  <Text
                    testID="widget-sync-status"
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {widgetSyncText}
                  </Text>
                </View>
              </MenuListItem>
            </MenuList>
          </>
        )}
        <MenuListHeadline>Actions Done</MenuListHeadline>
        <MenuList style={{}}>
          {settings.actionsDone.map((action) => (
            <MenuListItem
              style={{
                flexDirection: "column",
              }}
              key={`${action.title}-${action.date}`}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    maxWidth: "85%",
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 17,
                      marginTop: 4,
                    }}
                  >
                    {action.title}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {dayjs(action.date).format("L - LT")}
                  </Text>
                </View>
                <LinkButton
                  onPress={() => {
                    removeActionDone(action.title);
                  }}
                >
                  <ButtonIcon icon={Trash} size={20} />
                </LinkButton>
              </View>
            </MenuListItem>
          ))}
        </MenuList>
        <Button
          type="danger"
          style={{
            marginTop: 16,
          }}
          onPress={() => {
            setSettings((currentSettings) => ({
              ...currentSettings,
              actionsDone: currentSettings.actionsDone.filter(
                (action) => !action?.title?.startsWith("question_slide_")
              ),
            }));
          }}
        >
          {t("development_statistics_reset_questions")}
        </Button>
        <Button
          type="danger"
          style={{
            marginTop: 12,
          }}
          onPress={() => {
            setSettings((currentSettings) => ({
              ...currentSettings,
              actionsDone: [],
            }));
          }}
        >
          {t("development_statistics_reset_actions")}
        </Button>
        <TextInfo>
          {t("development_statistics_reset_questions_description")}
        </TextInfo>
        <View
          style={{
            height: 100,
          }}
        />
      </ScrollView>
    </View>
  );
};
