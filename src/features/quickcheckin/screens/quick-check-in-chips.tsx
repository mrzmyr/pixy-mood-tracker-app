import Check from "lucide-react-native/icons/check";
import { Pressable, View, useColorScheme } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import { EmotionIndicator } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { PersonChip } from "@/features/people";
import type { Person } from "@/features/people";
import { TagComponent } from "@/features/tags";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import useScale from "@/hooks/use-scale";
import { getRatingLabel } from "@/lib/rating-label";
import { useSetting } from "@/state/settings";
import type { Emotion } from "@/types";
import type { InfluenceOption } from "../ranking";

/** One rating as a square pixel. Seven fill a row. */
export const MoodPixel = ({
  rating,
  selected,
  onPress,
}: {
  rating: LogItem["rating"];
  selected: boolean;
  onPress: () => void;
}) => {
  const haptics = useHaptics();
  const scale = useScale(useSetting("scaleType"));
  const colorScheme = useColorScheme();

  return (
    <Pressable
      testID={`quick-check-in-mood-${rating}`}
      accessibilityRole="radio"
      accessibilityLabel={getRatingLabel(rating)}
      accessibilityState={{ selected }}
      onPress={async () => {
        await haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor:
          colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)",
        backgroundColor: scale.colors[rating].background,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Check
        color={selected ? scale.colors[rating].text : "transparent"}
        width={20}
        height={20}
      />
    </Pressable>
  );
};

/** Emotion as a chip, same shape as tag chips. */
export const EmotionChip = ({
  emotion,
  selected,
  onPress,
}: {
  emotion: Emotion;
  selected: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();

  const idleBorder =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={emotion.label}
      accessibilityState={{ checked: selected }}
      onPress={async () => {
        await haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: selected ? colors.tint : idleBorder,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 8,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <EmotionIndicator emotion={emotion} />
      <Label
        size={16}
        style={{ color: selected ? colors.tagTextActive : colors.tagText }}
      >
        {emotion.label}
      </Label>
    </Pressable>
  );
};

/** Emotion chips that wrap, for one list of emotions. */
export const EmotionChips = ({
  emotions,
  picked,
  onToggle,
}: {
  emotions: Emotion[];
  picked: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
    {emotions.map((emotion) => (
      <EmotionChip
        key={emotion.key}
        emotion={emotion}
        selected={picked.has(emotion.key)}
        onPress={() => onToggle(emotion.key)}
      />
    ))}
  </View>
);

/** Space between chips, same as emotion chips. */
const CHIP_GAP = 8;

/** People and tags as wrapping chips. Options without a match are skipped. */
export const InfluenceChips = ({
  options,
  people,
  tags,
  picked,
  onToggle,
}: {
  options: InfluenceOption[];
  people: Person[];
  tags: Tag[];
  /** Picked items as `person:<id>` and `tag:<id>`. */
  picked: ReadonlySet<string>;
  onToggle: (option: InfluenceOption) => void;
}) => {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const personById = new Map(people.map((person) => [person.id, person]));

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: CHIP_GAP }}>
      {options.map((option) => {
        const key = `${option.kind}:${option.id}`;
        const selected = picked.has(key);
        const person =
          option.kind === "person" ? personById.get(option.id) : undefined;
        if (person) {
          return (
            <PersonChip
              key={key}
              person={person}
              selected={selected}
              onPress={() => onToggle(option)}
            />
          );
        }
        const tag = tagById.get(option.id);
        if (!tag) {
          return null;
        }
        return (
          <TagComponent
            key={key}
            title={tag.title}
            colorName={tag.color}
            selected={selected}
            onPress={() => onToggle(option)}
          />
        );
      })}
    </View>
  );
};
