import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { PageWithHeaderLayout } from "@/components/PageWithHeaderLayout";
import TextInfo from "@/components/TextInfo";
import { t } from "@/helpers/translation";
import dayjs from "dayjs";
import { ScrollView, Text, View, ViewStyle } from "react-native";
import useColors from "../hooks/useColors";
import { useLogState } from "../hooks/useLogs";
import { useSettings } from "../hooks/useSettings";
import { useTagsState } from "../hooks/useTags";
import { Trash } from "lucide-react-native";

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
        borderRadius: 8,
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

export const DevelopmentTools = () => {
  const colors = useColors();
  const logState = useLogState();
  const { tags } = useTagsState()
  const { settings, setSettings, removeActionDone } = useSettings();

  const words_total = logState.items
    .map((d) => d.message.split(" ").length)
    .reduce((a, b) => a + b, 0);

  return (
    <PageWithHeaderLayout
      style={{
        flex: 1,
      }}
    >
      <ScrollView
        style={{
          padding: 16,
          backgroundColor: colors.background,
        }}
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
            {
              logState.items.filter((d) => d.tags.length > 0)
                .length
            }
          </Card>
        </View>
        <MenuListHeadline>Device Information</MenuListHeadline>
        <MenuList>
          <MenuListItem
            isLast
          >
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
        </MenuList>
        <MenuListHeadline>Actions Done</MenuListHeadline>
        <MenuList style={{}}>
          {settings.actionsDone.map((action, i) => (
            <MenuListItem
              style={{
                flexDirection: "column",
              }}
              key={i}
              isLast={i === settings.actionsDone.length - 1}
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
                ><Trash size={20} color={colors.tint} /></LinkButton>
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
            setSettings((settings) => ({
              ...settings,
              actionsDone: settings.actionsDone.filter(
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
            setSettings((settings) => ({
              ...settings,
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
    </PageWithHeaderLayout>
  );
};
