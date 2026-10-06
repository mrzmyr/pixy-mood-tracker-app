import Bezel from "@/components/Bezel";
import FlagHighlight from "@/components/FlagHighlight";
import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Edit,
  Ellipsis,
  Moon,
  Sun,
  SunMedium,
  Sunrise,
  Sunset,
  Trash,
} from "lucide-react-native";
import type { LoggerStep } from "@/constants/LoggerSteps";
import { getAvailableStepsForEdit, hasSleepOnDate } from "@/features/logger";
import Alert from "@/lib/Alert";
import { getItemDate } from "@/lib/logDates";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSetting, useSettings } from "@/state/settings";
import {
  ActionSheetIOS,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { AddPills } from "./AddPills";
import type { AddableStep } from "./AddPills";
import { Emotions } from "./Emotions";
import { BLOCK_GAP } from "./layout";
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

/**
 * Edit and Delete for one entry. Native platforms open a menu from one
 * button; web has no menu with three choices, so it keeps two buttons.
 */
const EntryActions = ({
  item,
  onEdit,
  onDelete,
}: {
  item: LogItem;
  onEdit: (item: LogItem) => void;
  onDelete: (item: LogItem) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  if (Platform.OS === "web") {
    return (
      <View style={{ flexDirection: "row", marginRight: -8 }}>
        <LinkButton
          testID="log-list-edit"
          accessibilityLabel={t("edit")}
          onPress={() => onEdit(item)}
          style={{ padding: 11 }}
        >
          <Edit color={colors.textSecondary} size={22} />
        </LinkButton>
        <LinkButton
          testID="log-list-delete"
          accessibilityLabel={t("delete")}
          onPress={() => onDelete(item)}
          style={{ padding: 11 }}
        >
          <Trash color={colors.textSecondary} size={22} />
        </LinkButton>
      </View>
    );
  }

  const open = async () => {
    await haptics.selection();
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("edit"), t("delete"), t("cancel")],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) {
            onEdit(item);
          }
          if (index === 1) {
            onDelete(item);
          }
        }
      );
      return;
    }
    Alert.alert(dayjs(item.dateTime).format("LT"), undefined, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => onDelete(item),
      },
      { text: t("edit"), onPress: () => onEdit(item) },
    ]);
  };

  return (
    <Pressable
      testID="log-list-more"
      accessibilityRole="button"
      accessibilityLabel={t("more")}
      onPress={open}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        marginRight: -10,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ellipsis color={colors.textSecondary} size={22} />
    </Pressable>
  );
};

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
        // Sits in the bezel shell; the shell gap adds to this padding.
        paddingTop: 6,
        paddingHorizontal: 10,
        paddingBottom: 10,
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
      <Bezel
        radius={RADIUS.md}
        style={{ flex: 1 }}
        innerStyle={{
          flex: 1,
          backgroundColor: colors.logCardBackground,
        }}
        header={
          <EntryHeader
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
            onEditSleep={editStep("sleep")}
          />
        }
      >
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
      </Bezel>
    </View>
  );
};
