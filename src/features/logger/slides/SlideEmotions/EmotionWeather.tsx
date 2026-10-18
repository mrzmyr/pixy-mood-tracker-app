import chroma from "chroma-js";
import keyBy from "lodash/keyBy";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import { EMOTIONS } from "../../config";
import { EmotionButtonBasic } from "./EmotionButtonBasic";
import { toggleWeather, WEATHER } from "./weather";
import type { Weather } from "./weather";

const EMOTIONS_BY_KEY = keyBy(EMOTIONS, "key");
// Reanimated skips layout animations while the system reduces motion.
const CARD_ENTERING = FadeInDown.duration(250);
const TILE_ROWS = [
  WEATHER.slice(0, 3),
  WEATHER.slice(3, 6),
  WEATHER.slice(6, 9),
];
// Shared by grid cells and the spacer after a lone last cell.
const CELL_STYLE = { flex: 1 };

const WeatherTile = ({
  weather,
  selected,
  onPress,
}: {
  weather: Weather;
  selected: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const Icon = weather.icon;

  return (
    <Pressable
      testID={`emotion-weather-${weather.id}`}
      accessibilityRole="togglebutton"
      accessibilityLabel={t(weather.name)}
      accessibilityHint={t(weather.text)}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1.1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 8,
        borderRadius: RADIUS.md,
        backgroundColor: chroma(weather.hue).alpha(0.14).css(),
        borderWidth: 2,
        borderColor: selected ? colors.tint : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={30} color={weather.hue} strokeWidth={1.75} />
      <Text
        numberOfLines={2}
        style={{
          color: colors.text,
          fontSize: 14,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {t(weather.name)}
      </Text>
    </Pressable>
  );
};

const WeatherCard = ({
  weather,
  selectedEmotions,
  onPress,
}: {
  weather: Weather;
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
}) => {
  const colors = useColors();
  const [meaning, setMeaning] = useState<Emotion | null>(null);
  const emotions = weather.emotions.flatMap((key) => {
    const emotion = EMOTIONS_BY_KEY[key];
    return emotion ? [emotion] : [];
  });
  const rows: Emotion[][] = [];
  for (let i = 0; i < emotions.length; i += 2) {
    rows.push(emotions.slice(i, i + 2));
  }

  return (
    <Animated.View
      entering={CARD_ENTERING}
      testID={`emotion-weather-card-${weather.id}`}
      style={{
        marginTop: 16,
        padding: 14,
        borderRadius: RADIUS.md,
        backgroundColor: chroma(weather.hue).alpha(0.08).css(),
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}
      >
        {t("log_emotions_weather_feels_like", { weather: t(weather.name) })}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 15,
          marginTop: 2,
          marginBottom: 12,
        }}
      >
        {t(weather.text)}
      </Text>
      <View style={{ gap: 8 }}>
        {rows.map((row) => (
          <View key={row[0]?.key} style={{ flexDirection: "row", gap: 8 }}>
            {row.map((emotion) => (
              <View key={emotion.key} style={CELL_STYLE}>
                <EmotionButtonBasic
                  emotion={emotion}
                  onPress={onPress}
                  onLongPress={setMeaning}
                  selected={selectedEmotions.some((e) => e.key === emotion.key)}
                />
              </View>
            ))}
            {row.length === 1 && <View style={CELL_STYLE} />}
          </View>
        ))}
      </View>
      {meaning && (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: colors.text,
            fontSize: 15,
            lineHeight: 21,
            marginTop: 12,
          }}
        >
          <Text style={{ fontWeight: "600" }}>{meaning.label}: </Text>
          {meaning.description}
        </Text>
      )}
    </Animated.View>
  );
};

/**
 * Inner weather emotion picker (flag `emotion-weather`). Pick one or two
 * weather tiles; each shows the emotions that feel like it. A third pick
 * drops the oldest. Long press on an emotion shows its meaning.
 */
export const EmotionWeather = ({
  selectedEmotions,
  onPress,
}: {
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const [picked, setPicked] = useState<string[]>([]);
  const pickedIds = new Set(picked);

  return (
    <ScrollView
      testID="emotion-weather"
      contentContainerStyle={{
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 140,
      }}
    >
      <View style={{ gap: 8 }}>
        {TILE_ROWS.map((row) => (
          <View key={row[0]?.id} style={{ flexDirection: "row", gap: 8 }}>
            {row.map((weather) => (
              <WeatherTile
                key={weather.id}
                weather={weather}
                selected={pickedIds.has(weather.id)}
                onPress={() => {
                  haptics.selection();
                  setPicked((current) => toggleWeather(current, weather.id));
                }}
              />
            ))}
          </View>
        ))}
      </View>
      {picked.length === 0 ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          {t("log_emotions_weather_empty")}
        </Text>
      ) : (
        picked.map((id) => {
          const weather = WEATHER.find((w) => w.id === id);
          return weather ? (
            <WeatherCard
              key={id}
              weather={weather}
              selectedEmotions={selectedEmotions}
              onPress={onPress}
            />
          ) : null;
        })
      )}
    </ScrollView>
  );
};
