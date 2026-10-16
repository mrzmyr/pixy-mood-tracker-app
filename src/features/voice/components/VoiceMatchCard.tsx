import { View } from "react-native";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import { RADIUS } from "@/constants/Radius";
import { EMOTIONS, EmotionIndicator } from "@/features/logger";
import { PersonAvatar, usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useColors from "@/hooks/useColors";
import { Body, Secondary } from "@/components/Type";
import { t } from "@/lib/translation";
import type { VoiceMatch } from "../matchTranscript";

const KIND_LABEL = {
  person: "voice_kind_person",
  tag: "voice_kind_tag",
  emotion: "voice_kind_emotion",
} as const;

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
      <View
        style={{
          width: 12,
          height: 12,
          marginHorizontal: 6,
          borderRadius: RADIUS.full,
          backgroundColor: tag
            ? colors.tags[tag.color]?.dot
            : colors.textSecondary,
        }}
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

/** One detected person, tag, or emotion, as a card in voice mode. */
export const VoiceMatchCard = ({ match }: { match: VoiceMatch }) => {
  const colors = useColors();
  const kind = t(KIND_LABEL[match.kind]);

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOut.duration(150)}
      accessible
      accessibilityLabel={`${kind}: ${match.text}`}
      testID={`voice-match-${match.kind}-${match.id}`}
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
      <Marker match={match} />
      <View style={{ flex: 1 }}>
        <Body>{match.text}</Body>
        <Secondary>{kind}</Secondary>
      </View>
    </Animated.View>
  );
};
