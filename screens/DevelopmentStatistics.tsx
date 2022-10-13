import dayjs from "dayjs";
import { ScrollView, Text, View, ViewStyle } from "react-native";
import Button from "../components/Button";
import MenuList from "../components/MenuList";
import MenuListHeadline from "../components/MenuListHeadline";
import MenuListItem from "../components/MenuListItem";
import TextInfo from "../components/TextInfo";
import useColors from "../hooks/useColors";
import { useLogState } from "../hooks/useLogs";
import { useSettings } from "../hooks/useSettings";
import { useTagsState } from "../hooks/useTags";
import { useTranslation } from "../hooks/useTranslation";

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

export const DevelopmentStatistics = () => {
  const { t } = useTranslation();
  const colors = useColors();
  const logState = useLogState();
  const { tags } = useTagsState()
  const { settings, setSettings } = useSettings();

  const words_total = Object.values(logState.items)
    .map((d) => d.message.split(" ").length)
    .reduce((a, b) => a + b, 0);

  return (
    <View
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
            {Object.keys(logState.items).length}
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
              Object.values(logState.items).filter((d) => d?.tags?.length > 0)
                .length
            }
          </Card>
        </View>
        <MenuListHeadline>Actions Done</MenuListHeadline>
        <MenuList style={{}}>
          {settings.actionsDone.map((action, i) => (
            <MenuListItem
              style={{
                flexDirection: "column",
              }}
              key={i}
              title={action.title}
              isLast={i === settings.actionsDone.length - 1}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {dayjs(action.date).format("DD.MM.YYYY - HH:mm")}
              </Text>
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
                (action) => !action.title.startsWith("question_slide_")
              ),
            }));
          }}
        >
          {t("development_statistics_reset_questions")}
        </Button>
        <Button
          type="danger"
          style={{
            marginTop: 16,
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
        <MenuListHeadline>Tags</MenuListHeadline>
        <MenuList style={{}}>
          {tags.map((tag, i) => (
            <MenuListItem
              style={{
                flexDirection: "column",
              }}
              key={i}
              title={tag.title}
              isLast={i === tags.length - 1}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {tag.id}
              </Text>
            </MenuListItem>
          ))}
        </MenuList>
        <View
          style={{
            height: 100,
          }}
        />
      </ScrollView>
    </View>
  );
};
