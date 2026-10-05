import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { Edit, Trash } from "lucide-react-native";
import { getAvailableStepsForEdit, hasSleepOnDate } from "@/features/logger";
import { getItemDate } from "@/lib/logDates";
import { useFeatureFlag } from "@/state/featureFlags";
import { ScrollView, Text, View } from "react-native";
import { Emotions } from "./Emotions";
import { Message } from "./Message";
import { People } from "./People";
import { Photos } from "./Photos";
import { useSettings } from "@/state/settings";
import { RatingDot } from "./RatingDot";
import { Sleep } from "./Sleep";
import { Tags } from "./Tags";
import { RADIUS } from "@/constants/Radius";

const EntryHeader = ({
  item,
  onEdit,
  onDelete,
}: {
  item: LogItem;
  onEdit: (item: LogItem) => void;
  onDelete: (item: LogItem) => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderBottomColor: colors.logCardBorder,
        borderBottomWidth: 1,
        paddingBottom: 12,
      }}
    >
      <RatingDot rating={item.rating} />
      <View
        style={{
          marginLeft: 12,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: colors.text,
          }}
        >
          {dayjs(item.dateTime).format("LT")}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <LinkButton
          testID="log-list-edit"
          onPress={() => {
            onEdit(item);
          }}
          style={{
            marginLeft: -8,
            marginTop: -8,
            marginBottom: -8,
            marginRight: 4,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <Edit color={colors.tint} size={22} />
        </LinkButton>
        <LinkButton
          testID="log-list-delete"
          style={{
            marginLeft: -8,
            marginTop: -8,
            marginBottom: -8,
            marginRight: -8,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 16,
            paddingRight: 16,
          }}
          onPress={() => {
            onDelete(item);
          }}
        >
          <Trash color={colors.tint} size={22} />
        </LinkButton>
      </View>
    </View>
  );
};

/**
 * Card for one entry in the day list with its sleep, emotions, tags,
 * people, photos, and message sections. People show behind the `people`
 * flag or when the entry has people. Stored photos always show, so turning
 * the `photos` feature flag or consent off never hides user data. With the
 * flag on, the section also shows empty when the photos step is on. A
 * section pencil shows only when the edit logger has that step: the step
 * is on in Settings > Steps, or the entry holds content for it. The trash
 * button calls `onDelete` without asking, so the caller must confirm.
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
  const hasPeople = useFeatureFlag("people");
  const { hasStep } = useSettings();
  const isPhotosEnabled = useFeatureFlag("photos");
  const logState = useLogState();
  // Same steps as the edit logger. A pencil for a missing step would open
  // the logger at the rating step instead.
  const editSteps = getAvailableStepsForEdit({
    item,
    hasStep,
    hasSleepOnDay: hasSleepOnDate(logState.items, getItemDate(item)),
    hasPeople,
    isPhotosEnabled,
  });
  const canEdit = (step: (typeof editSteps)[number]) =>
    editSteps.includes(step);

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: 16,
          paddingHorizontal: 16,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          borderColor: colors.logCardBorder,
          backgroundColor: colors.logCardBackground,
          position: "relative",
        }}
      >
        <EntryHeader item={item} onEdit={onEdit} onDelete={onDelete} />
        <ScrollView>
          <View
            style={{
              paddingBottom: 24,
            }}
          >
            <View
              style={{
                marginTop: 8,
              }}
            >
              <Sleep item={item} canEdit={canEdit("sleep")} />
            </View>
            <View
              style={{
                marginTop: 8,
              }}
            >
              <Emotions item={item} canEdit={canEdit("emotions")} />
            </View>
            <View
              style={{
                marginTop: 8,
              }}
            >
              <Tags item={item} canEdit={canEdit("tags")} />
            </View>
            {(hasPeople || item.people.length > 0) && (
              <View style={{ marginTop: 8 }}>
                <People item={item} canEdit={canEdit("people")} />
              </View>
            )}
            {(item.photos.length > 0 ||
              (isPhotosEnabled && hasStep("photos"))) && (
              <View
                style={{
                  marginTop: 8,
                }}
              >
                <Photos item={item} canEdit={canEdit("photos")} />
              </View>
            )}
            <View
              style={{
                marginTop: 8,
              }}
            >
              <Message item={item} canEdit={canEdit("message")} />
            </View>
          </View>
        </ScrollView>
        <LinearGradient
          colors={[
            colors.logCardBackground,
            colors.logCardBackgroundTransparent,
          ]}
          style={{
            position: "absolute",
            height: 24,
            top: 67,
            left: 16,
            right: 16,
            zIndex: 999,
          }}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[
            colors.logCardBackgroundTransparent,
            colors.logCardBackground,
          ]}
          style={{
            position: "absolute",
            height: 24,
            bottom: 0,
            left: 16,
            right: 16,
            zIndex: 999,
          }}
          pointerEvents="none"
        />
      </View>
    </View>
  );
};
