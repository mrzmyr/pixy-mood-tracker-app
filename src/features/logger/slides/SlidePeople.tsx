import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import noop from "lodash/noop";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import { MiniButton } from "@/components/MiniButton";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useLogState } from "@/features/logs";
import {
  PersonChip,
  sortPeopleByUsage,
  usePeopleState,
} from "@/features/people";
import type { PersonReference } from "@/types";
import { SlideHeadline } from "../components/SlideHeadline";
import { useTemporaryLog } from "../temporaryLog";
import { Footer } from "./Footer";
import { getSlideMarginTop } from "./marginTop";

/**
 * People picker slide: "Who were you with?". Archived people are hidden
 * unless the draft already has them. Chips show the most used people of the
 * last 90 days first. Without people it offers one way out: add some.
 */
export const SlidePeople = ({
  onChange,
  onDisableStep = noop,
  showDisable,
}: {
  onChange: (people: PersonReference[]) => void;
  onDisableStep?: () => void;
  showDisable: boolean;
}) => {
  const tempLog = useTemporaryLog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { people } = usePeopleState();
  const { items } = useLogState();

  const selectedIds = new Set(
    (tempLog?.data?.people ?? []).map((person) => person.id)
  );
  const visible = sortPeopleByUsage(
    people.filter((person) => !person.isArchived || selectedIds.has(person.id)),
    items
  );
  const marginTop = getSlideMarginTop();

  const toggle = (id: string) => {
    const current = tempLog?.data?.people ?? [];
    onChange(
      selectedIds.has(id)
        ? current.filter((person) => person.id !== id)
        : [...current, { id }]
    );
  };

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
        marginTop,
      }}
    >
      <SlideHeadline>{t("log_people_question")}</SlideHeadline>
      <View style={{ position: "relative", flex: 1 }}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.logBackground, colors.logBackgroundTransparent]}
          style={{
            position: "absolute",
            height: 24,
            top: 0,
            zIndex: 1,
            width: "100%",
          }}
        />
        <LinearGradient
          colors={[colors.logBackgroundTransparent, colors.logBackground]}
          style={{
            position: "absolute",
            height: 32,
            bottom: 0,
            zIndex: 1,
            width: "100%",
          }}
          pointerEvents="none"
        />
        {people.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 17,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {t("people_slide_empty")}
            </Text>
            <Button
              onPress={() => router.push("/people")}
              testID="log-people-add"
            >
              {t("people_add")}
            </Button>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                marginTop: 24,
                paddingBottom: insets.bottom,
              }}
            >
              {visible.map((person) => (
                <PersonChip
                  key={person.id}
                  person={person}
                  selected={selectedIds.has(person.id)}
                  onPress={() => toggle(person.id)}
                  testID={`log-person-${person.id}`}
                />
              ))}
              <View>
                <MiniButton onPress={() => router.push("/people")}>
                  {t("people_manage")}
                </MiniButton>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
      <Footer>
        {showDisable && (
          <LinkButton
            type="secondary"
            onPress={onDisableStep}
            style={{ fontWeight: "400" }}
          >
            {t("log_people_disable")}
          </LinkButton>
        )}
      </Footer>
    </View>
  );
};
