import type { NavigationProp } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { APP_VARIANT } from "@/constants/AppVariant";
import useColors from "@/hooks/useColors";
import type { RootStackParamList, RootStackScreenProps } from "../../types";
import pkg from "../../package.json";
import {
  FIXTURES,
  getFixture,
  getStorageFixture,
  STORAGE_FIXTURES,
} from "@/dev/fixtures";
import type { Fixture } from "@/dev/fixtures";

import { setFileTransferOverride } from "@/features/datagate";
import { fakeFileTransfer } from "@/dev/fakeFileTransfer";
import { useLoadFixture, writeStorageFixture } from "@/dev/useLoadFixture";

// Drops every screen behind the new state, like a fresh app start.
const openApp = (
  navigation: NavigationProp<RootStackParamList>,
  fixture: Fixture
) => {
  navigation.reset({
    index: 0,
    routes: fixture.isFresh
      ? [{ name: "tabs" }, { name: "Onboarding" }]
      : [{ name: "tabs" }],
  });
};

/** Settings > Test data: replace all data with a fixture. */
export const DevFixturesScreen = ({
  navigation,
}: RootStackScreenProps<"DevFixtures">) => {
  const colors = useColors();
  const { isReady, load } = useLoadFixture();

  const confirm = (fixture: Fixture) => {
    Alert.alert(
      `Load "${fixture.title}"?`,
      "This replaces all entries, tags, and settings.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => {
            load(fixture);
            openApp(navigation, fixture);
          },
          style: "destructive",
          text: "Replace data",
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1, padding: 16 }}
    >
      <MenuListHeadline>Fixtures</MenuListHeadline>
      <MenuList>
        {FIXTURES.map((fixture, index) => (
          <MenuListItem
            key={fixture.id}
            title={fixture.title}
            onPress={isReady ? () => confirm(fixture) : undefined}
            isLast={index === FIXTURES.length - 1}
            testID={`fixture-${fixture.id}`}
          />
        ))}
      </MenuList>
      {FIXTURES.map((fixture) => (
        <TextInfo key={fixture.id}>
          {`${fixture.title} (${fixture.id}): ${fixture.description}`}
        </TextInfo>
      ))}
      {STORAGE_FIXTURES.map((fixture) => (
        <TextInfo key={fixture.id}>
          {`${fixture.id} (link only, restart after): ${fixture.description}`}
        </TextInfo>
      ))}
      <TextInfo>
        {`Tests load a fixture with ${Linking.createURL("dev/fixture")}?id=<id>. Variant ${APP_VARIANT}, version ${pkg.version}.`}
      </TextInfo>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

/**
 * Target of `<scheme>://dev/fixture?id=<id>`. Loads the fixture once every
 * store has read storage, then opens the app on the new data. A storage
 * fixture is written to AsyncStorage instead and needs an app restart.
 */
export const DevFixtureLinkScreen = ({
  navigation,
  route,
}: RootStackScreenProps<"DevFixture">) => {
  const colors = useColors();
  const { isReady, load } = useLoadFixture();
  const isLoaded = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const fixture = getFixture(route.params.id);
  const storageFixture = getStorageFixture(route.params.id);

  useEffect(() => {
    if ((!fixture && !storageFixture) || !isReady || isLoaded.current) {
      return;
    }
    isLoaded.current = true;
    if (storageFixture) {
      const write = async () => {
        try {
          await writeStorageFixture(storageFixture);
          setMessage("Storage written. Restart Pixy to load it.");
        } catch (error) {
          setMessage(
            [
              "fixture_storage_failed: Could not write storage fixture",
              `why: ${error instanceof Error ? error.message : String(error)}`,
              "fix: Restart Pixy, then open the link again.",
            ].join("\n")
          );
        }
      };
      write();
      return;
    }
    if (fixture) {
      load(fixture);
      openApp(navigation, fixture);
    }
  }, [fixture, storageFixture, isReady, load, navigation]);

  let text = message;
  if (!text && !fixture && !storageFixture) {
    text = [
      `fixture_unknown: Unknown fixture "${route.params.id}"`,
      "why: No fixture in src/dev/fixtures has this ID.",
      "fix: Open Settings > Test data for the list of fixture IDs.",
    ].join("\n");
  }

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.background,
        flex: 1,
        justifyContent: "center",
        padding: 24,
      }}
      testID="dev-fixture-link"
    >
      {text ? (
        <Text style={{ color: colors.text, fontSize: 15 }}>{text}</Text>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
};

/**
 * Target of `<scheme>://dev/fake-files`. Swaps the share sheet and document
 * picker for `fakeFileTransfer` until the app restarts, then opens the app.
 */
export const DevFakeFilesLinkScreen = ({
  navigation,
}: RootStackScreenProps<"DevFakeFiles">) => {
  useEffect(() => {
    setFileTransferOverride(fakeFileTransfer);
    navigation.reset({ index: 0, routes: [{ name: "tabs" }] });
  }, [navigation]);

  return <ActivityIndicator testID="dev-fake-files-link" />;
};
