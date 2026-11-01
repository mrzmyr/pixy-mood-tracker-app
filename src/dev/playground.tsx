import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  View,
} from "react-native";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";
import {
  PLAYGROUND_SECTIONS,
  RecapStoryPlayground,
} from "@/features/recaps/playground";
import useColors from "@/hooks/use-colors";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { getPlaygroundFixtures, toPlaygroundData } from "@/dev/playground-data";
import type { PlaygroundSets } from "@/dev/playground-data";
import { withPhotoFiles } from "@/dev/use-load-fixture";

/** Settings > Playground: components in every state, without loading test data. */
export const DevPlaygroundScreen = () => {
  const router = useRouter();
  const colors = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1, padding: 16 }}
    >
      {PLAYGROUND_SECTIONS.map((section) => (
        <View key={section.title}>
          <MenuListHeadline>{section.title}</MenuListHeadline>
          <MenuList>
            {section.decks.map((deck) => (
              <MenuListItem
                key={deck.id}
                title={deck.title}
                onPress={() =>
                  router.push({
                    pathname: "/dev/playground/recap-story",
                    params: { deck: deck.id },
                  })
                }
                testID={`playground-${deck.id}`}
              />
            ))}
          </MenuList>
        </View>
      ))}
      <TextInfo>
        {`Slides use the recap story fixtures and never change your data. Link: ${Linking.createURL("dev/playground/recap-story")}?deck=<id>&theme=light|dark. Deck IDs: all, week, month, <type>, <type>/<index>.`}
      </TextInfo>
    </ScrollView>
  );
};

/** Playground fixtures with their photo files imported like picked photos. */
const loadSets = async (weekLocale: string): Promise<PlaygroundSets | null> => {
  const fixtures = getPlaygroundFixtures(weekLocale);
  if (!fixtures) {
    return null;
  }
  const [month, week] = await Promise.all(
    [fixtures.month, fixtures.week].map(async ({ data, date }) =>
      toPlaygroundData({ data: await withPhotoFiles(data), date })
    )
  );
  return month && week ? { month, week } : null;
};

/** Fixture data with photo files, imported once per app start. */
let loading: Promise<PlaygroundSets | null> | null = null;

/**
 * Target of `<scheme>://dev/playground/recap-story?deck=<id>&theme=light|dark`.
 * Plays the slides of one playground deck. `theme` defaults to the app's.
 */
export const DevRecapPlaygroundScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const weekLocale = useWeekLocale();
  const { deck = "all", theme } = useLocalSearchParams<{
    deck?: string;
    theme?: string;
  }>();
  // `undefined` while loading, `null` without the fixtures.
  const [data, setData] = useState<PlaygroundSets | null | undefined>();

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!loading) {
        loading = loadSets(weekLocale);
      }
      const loaded = await loading;
      if (isActive) {
        setData(loaded);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, [weekLocale]);

  if (!data) {
    return (
      <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
        {data === null ? (
          <TextInfo>
            {[
              "playground_fixture_missing: Recap story fixtures not found",
              "why: No fixture has the ID recap-story.",
              "fix: Register the fixture in src/dev/fixtures/index.ts.",
            ].join("\n")}
          </TextInfo>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  return (
    <RecapStoryPlayground
      deck={deck}
      data={data}
      isDark={theme ? theme === "dark" : colorScheme === "dark"}
      onClose={() =>
        // A deep link opens the player with nothing behind it.
        router.canGoBack() ? router.back() : router.replace("/dev/playground")
      }
    />
  );
};
