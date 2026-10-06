import FlagHighlight from "@/components/FlagHighlight";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Moon, Sun, SunMedium, Sunrise, Sunset } from "lucide-react-native";
import type { LoggerStep } from "@/constants/LoggerSteps";
import { getAvailableStepsForEdit, hasSleepOnDate } from "@/features/logger";
import { getItemDate } from "@/lib/logDates";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSetting, useSettings } from "@/state/settings";
import { ScrollView, Text, View } from "react-native";
import { AddPills } from "./AddPills";
import type { AddableStep } from "./AddPills";
import { Emotions } from "./Emotions";
import { EntryMenu } from "./EntryMenu";
import { BLOCK_GAP, INSET } from "./layout";
import { Message } from "./Message";
import { People, useKnownPeople } from "./People";
import { Photos } from "./Photos";
import { Sleep } from "./Sleep";
import { Tags } from "./Tags";
import { getTimeOfDay } from "./timeOfDay";
import type { TimeOfDay } from "./timeOfDay";
import { RADIUS } from "@/constants/Radius";

const TIME_OF_DAY_ICONS: Record<TimeOfDay, typeof Sun> = {
  morning: Sunrise,
  midday: Sun,
  afternoon: SunMedium,
  evening: Sunset,
  night: Moon,
};

/** Edit and Delete for one entry behind one "…" menu with a 44 pt target. */
const EntryActions = ({
  item,
  onEdit,
  onDelete,
}: {
  item: LogItem;
  onEdit: (item: LogItem) => void;
  onDelete: (item: LogItem) => void;
}) => (
  <EntryMenu
    testID="log-list-menu"
    label={t("more")}
    editLabel={t("edit")}
    deleteLabel={t("delete")}
    onEdit={() => onEdit(item)}
    onDelete={() => onDelete(item)}
  />
);

const EntryHeader = ({
  item,
  onEdit,
  onDelete,
  onEditSleep,
}: {
  item: LogItem;
  onEdit: (item: LogItem) => void;
  onDelete: (item: LogItem) => void;
  onEditSleep?: () => void;
}) => {
  const colors = useColors();
  const scaleType = useSetting("scaleType");
  const timeOfDay = getTimeOfDay(item.dateTime);
  const TimeOfDayIcon = TIME_OF_DAY_ICONS[timeOfDay];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginHorizontal: INSET,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomColor: colors.logCardBorder,
        borderBottomWidth: 1,
      }}
    >
      <View
        style={{
          width: 6,
          alignSelf: "stretch",
          borderRadius: RADIUS.full,
          backgroundColor: colors.scales[scaleType][item.rating].background,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {dayjs(item.dateTime).format("LT")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <TimeOfDayIcon color={colors.textSecondary} size={14} />
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {t(timeOfDay)}
            </Text>
          </View>
          <Sleep item={item} onEdit={onEditSleep} />
        </View>
      </View>
      <EntryActions item={item} onEdit={onEdit} onDelete={onDelete} />
    </View>
  );
};

/**
 * Card for one entry in the day list. No section titles: white space
 * divides the blocks. Short blocks come first (emotions, people, tags,
 * photos), the note last, so a long note never hides the rest. Empty steps
 * show as dashed add pills at the end.
 *
 * A block or pill opens the logger at its step, only when the edit logger
 * has that step: the step is on in Settings > Steps, or the entry holds
 * content for it. People show behind the `people` flag or when the entry has
 * people. Stored photos always show, so turning the `photos` flag or consent
 * off never hides user data. Delete calls `onDelete` without asking, so the
 * caller must confirm.
 */
export const Entry = ({
  item,
  onEdit,
  onDelete,
}: {
  item: LogItem;
  onEdit: (item: LogItem) => void;
  onDelete: (item: LogItem) => void;
}) => {
  const colors = useColors();
  const router = useRouter();
  const hasPeople = useFeatureFlag("people");
  const { hasStep } = useSettings();
  const isPhotosEnabled = useFeatureFlag("photos");
  const logState = useLogState();
  const knownPeople = useKnownPeople(item);
  // Same steps as the edit logger. A link to a missing step would open the
  // logger at the rating step instead.
  const editSteps = getAvailableStepsForEdit({
    item,
    hasStep,
    hasSleepOnDay: hasSleepOnDate(logState.items, getItemDate(item)),
    hasPeople,
    isPhotosEnabled,
  });
  const editStep = (step: LoggerStep) =>
    editSteps.includes(step)
      ? () => {
          router.push({
            pathname: "/logs/[id]/edit",
            params: { id: item.id, step },
          });
        }
      : undefined;

  const editableSteps = new Set(editSteps);
  const emptySteps: [AddableStep, boolean][] = [
    ["emotions", item.emotions.length === 0],
    ["people", knownPeople.length === 0],
    ["tags", item.tags.length === 0],
    ["photos", item.photos.length === 0],
    ["message", item.message.trim() === ""],
  ];
  const addSteps = emptySteps.flatMap(([step, isEmpty]) =>
    isEmpty && editableSteps.has(step) ? [step] : []
  );

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: colors.logCardBorder,
          backgroundColor: colors.logCardBackground,
          overflow: "hidden",
        }}
      >
        <EntryHeader
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditSleep={editStep("sleep")}
        />
        <ScrollView
          contentContainerStyle={{
            paddingTop: 20,
            paddingBottom: 32,
            gap: BLOCK_GAP,
          }}
        >
          <Emotions item={item} onEdit={editStep("emotions")} />
          {knownPeople.length > 0 && (
            <FlagHighlight flag="people">
              <People item={item} onEdit={editStep("people")} />
            </FlagHighlight>
          )}
          <Tags item={item} onEdit={editStep("tags")} />
          {item.photos.length > 0 && (
            <FlagHighlight flag="photos">
              <Photos item={item} onEdit={editStep("photos")} />
            </FlagHighlight>
          )}
          <Message item={item} onEdit={editStep("message")} />
          <AddPills steps={addSteps} onAdd={(step) => editStep(step)?.()} />
        </ScrollView>
        <LinearGradient
          colors={[
            colors.logCardBackgroundTransparent,
            colors.logCardBackground,
          ]}
          style={{
            position: "absolute",
            height: 32,
            bottom: 0,
            left: 0,
            right: 0,
          }}
          pointerEvents="none"
        />
      </View>
    </View>
  );
};
