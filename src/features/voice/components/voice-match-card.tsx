import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import { RADIUS } from "@/constants/radius";
import { EMOTIONS, EmotionIndicator } from "@/features/logger";
import { PersonAvatar, usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import useScale from "@/hooks/use-scale";
import { Body, Secondary } from "@/components/type";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import type { VoiceMatch } from "../match-transcript";
import type { MoodTrigger } from "../mood-triggers";

const KIND_LABEL = {
  person: "voice_kind_person",
  tag: "voice_kind_tag",
  emotion: "voice_kind_emotion",
} as const;

const Dot = ({ color }: { color: string }) => (
  <View
    style={{
      width: 12,
      height: 12,
      marginHorizontal: 6,
      borderRadius: RADIUS.full,
      backgroundColor: color,
    }}
  />
);

const Marker = ({ match }: { match: VoiceMatch }) => {
  const colors = useColors();
  const { people } = usePeopleState();
  const { tags } = useTagsState();

  if (match.kind === "person") {
    const person = people.find((item) => item.id === match.id);
    return person ? <PersonAvatar person={person} size={24} /> : null;
  }
  if (match.kind === "tag") {
    const tag = tags.find((item) => item.id === match.id);
    return (
      <Dot
        color={(tag && colors.tags[tag.color]?.dot) ?? colors.textSecondary}
      />
    );
  }
  const emotion = EMOTIONS.find((item) => item.key === match.id);
  return emotion ? (
    <View style={{ width: 24, alignItems: "center" }}>
      <EmotionIndicator emotion={emotion} />
    </View>
  ) : null;
};

const Card = ({
  marker,
  title,
  kind,
  testID,
}: {
  marker: ReactNode;
  title: string;
  kind: string;
  testID: string;
}) => {
  const colors = useColors();

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOut.duration(150)}
      accessible
      accessibilityLabel={`${kind}: ${title}`}
      testID={testID}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: RADIUS.md,
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.cardBorder,
      }}
    >
      {marker}
      <View style={{ flex: 1 }}>
        <Body>{title}</Body>
        <Secondary>{kind}</Secondary>
      </View>
    </Animated.View>
  );
};

/** One detected person, tag, or emotion, as a card in voice mode. */
export const VoiceMatchCard = ({ match }: { match: VoiceMatch }) => (
  <Card
    marker={<Marker match={match} />}
    title={match.text}
    kind={t(KIND_LABEL[match.kind])}
    testID={`voice-match-${match.kind}-${match.id}`}
  />
);

/** Spoken mood, as a card in voice mode. Dot in the user's scale color. */
export const VoiceMoodCard = ({ mood }: { mood: MoodTrigger }) => {
  const scale = useScale(useSetting("scaleType"));

  return (
    <Card
      marker={<Dot color={scale.colors[mood.rating].background} />}
      // Trigger words are lowercase in most languages.
      title={mood.text.charAt(0).toLocaleUpperCase() + mood.text.slice(1)}
      kind={t("mood")}
      testID={`voice-match-mood-${mood.rating}`}
    />
  );
};
