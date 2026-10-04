import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Check } from "lucide-react-native";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import { APP_VARIANT } from "@/constants/AppVariant";
import useColors from "@/hooks/useColors";
import pkg from "../../package.json";
import {
  FIXTURES,
  getFixture,
  getStorageFixture,
  STORAGE_FIXTURES,
} from "@/dev/fixtures";
import type { Fixture } from "@/dev/fixtures";

import { setFileTransferOverride } from "@/features/datagate";
import { setPhotoSourceOverride } from "@/features/photos";
import { fakeFileTransfer } from "@/dev/fakeFileTransfer";
import { fakePeopleSources } from "@/dev/fakePeopleSources";
import { addFakeContacts, removeFakeContacts } from "@/dev/fakeContacts";
import { setPeopleSourcesOverride } from "@/features/people";
import {
  getOverrides,
  isOverride,
  setOverride,
  subscribe,
} from "@/dev/featureFlagOverrides";
import type { FeatureFlagOverride } from "@/dev/featureFlagOverrides";
import { FEATURE_FLAGS, isFeatureFlag } from "@/state/featureFlags/keys";
import { useSettings } from "@/state/settings";
import { fakePhotoSource } from "@/dev/fakePhotoSource";
import { useLoadFixture, writeStorageFixture } from "@/dev/useLoadFixture";

// Drops every screen behind the new state, like a fresh app start.
const openApp = (router: ReturnType<typeof useRouter>, fixture: Fixture) => {
  router.dismissAll();
  router.replace(fixture.isFresh ? "/onboarding" : "/calendar");
};

/** Settings > Test data: replace all data with a fixture. */
export const DevFixturesScreen = () => {
  const router = useRouter();
  const colors = useColors();
  const { isReady, load } = useLoadFixture();

  const confirm = (fixture: Fixture) => {
    Alert.alert(
      `Load "${fixture.title}"?`,
      "This replaces all entries, tags, people, and settings.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => {
            load(fixture);
            openApp(router, fixture);
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
        {FIXTURES.map((fixture) => (
          <MenuListItem
            key={fixture.id}
            title={fixture.title}
            onPress={isReady ? () => confirm(fixture) : undefined}
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
export const DevFixtureLinkScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { isReady, load } = useLoadFixture();
  const isLoaded = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const fixture = getFixture(id);
  const storageFixture = getStorageFixture(id);

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
      openApp(router, fixture);
    }
  }, [fixture, storageFixture, isReady, load, router]);

  let text = message;
  if (!text && !fixture && !storageFixture) {
    text = [
      `fixture_unknown: Unknown fixture "${id}"`,
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
 * picker for `fakeFileTransfer`, the contact picker and person photo
 * library for `fakePeopleSources`, and the photo picker and photo library
 * for `fakePhotoSource`, until the app restarts. Then opens the app.
 */
export const DevFakeFilesLinkScreen = () => {
  const router = useRouter();
  useEffect(() => {
    setFileTransferOverride(fakeFileTransfer);
    setPeopleSourcesOverride(fakePeopleSources);
    setPhotoSourceOverride(fakePhotoSource);
    router.dismissAll();
    router.replace("/calendar");
  }, [router]);

  return <ActivityIndicator testID="dev-fake-files-link" />;
};

/** Largest `count` the fake contacts link accepts. */
const MAX_FAKE_CONTACTS = 2000;

/**
 * Target of `<scheme>://dev/fake-contacts?count=<n>`. Writes `n` fake
 * contacts into the real device address book, or with `count=0` deletes
 * every fake contact it wrote before. Shows the result as text.
 */
export const DevFakeContactsLinkScreen = () => {
  const colors = useColors();
  const { count } = useLocalSearchParams<{ count?: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const parsed = Number(count);
  const isValid =
    Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_FAKE_CONTACTS;

  useEffect(() => {
    if (!isValid) {
      return;
    }
    let isActive = true;
    void (async () => {
      let text: string;
      try {
        text =
          parsed === 0
            ? `Deleted ${await removeFakeContacts()} fake contacts.`
            : `Added ${await addFakeContacts(parsed)} fake contacts.`;
      } catch (error) {
        text = [
          "fake_contacts_failed: Could not change the address book",
          `why: ${error instanceof Error ? error.message : String(error)}`,
          "fix: Allow Contacts for Pixy Preview in the system settings, then open the link again.",
        ].join("\n");
      }
      if (isActive) {
        setMessage(text);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [isValid, parsed]);

  const text = isValid
    ? message
    : [
        `fake_contacts_count_invalid: Count "${count}" is not a number from 0 to ${MAX_FAKE_CONTACTS}`,
        "why: The link needs ?count=<n>; 0 deletes the fake contacts.",
        "fix: Open the link again with a valid count.",
      ].join("\n");

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.background,
        flex: 1,
        justifyContent: "center",
        padding: 24,
      }}
      testID="dev-fake-contacts-link"
    >
      {text ? (
        <Text style={{ color: colors.text, fontSize: 15 }}>{text}</Text>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
};

const OVERRIDE_OPTIONS: { value: FeatureFlagOverride; title: string }[] = [
  { value: "remote", title: "PostHog (needs consent)" },
  { value: "on", title: "On" },
  { value: "off", title: "Off" },
];

/**
 * Settings > Development > Feature flags: override PostHog flags on this device until the
 * app restarts. Overrides work without analytics consent.
 */
export const DevFeatureFlagsScreen = () => {
  const colors = useColors();
  const overrides = useSyncExternalStore(subscribe, getOverrides);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1, padding: 16 }}
    >
      {FEATURE_FLAGS.map((key) => (
        <View key={key}>
          <MenuListHeadline>{key}</MenuListHeadline>
          <MenuList>
            {OVERRIDE_OPTIONS.map((option) => (
              <MenuListItem
                key={option.value}
                title={option.title}
                onPress={() => setOverride({ key, value: option.value })}
                iconRight={
                  (overrides[key] ?? "remote") === option.value ? (
                    <Check size={18} color={colors.tint} />
                  ) : null
                }
                testID={`feature-flag-${key}-${option.value}`}
              />
            ))}
          </MenuList>
        </View>
      ))}
      <TextInfo>
        {`Overrides end when the app restarts. Tests set one with ${Linking.createURL("dev/feature-flag")}?key=<key>&value=on|off|remote.`}
      </TextInfo>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

/**
 * Target of `<scheme>://dev/feature-flag?key=<key>&value=on|off|remote`.
 * Sets the override until the app restarts, then opens the app.
 */
export const DevFeatureFlagLinkScreen = () => {
  const router = useRouter();
  const colors = useColors();
  const { settings, hasActionDone } = useSettings();
  const { key, value } = useLocalSearchParams<{
    key: string;
    value: string;
  }>();
  const isValid = isFeatureFlag(key) && isOverride(value);
  const isOnboarded = hasActionDone("onboarding");

  // Waits for settings: a cold start through the link has not read them yet.
  useEffect(() => {
    if (!isFeatureFlag(key) || !isOverride(value) || !settings.loaded) {
      return;
    }
    setOverride({ key, value });
    router.dismissAll();
    router.replace(isOnboarded ? "/calendar" : "/onboarding");
  }, [key, value, settings.loaded, isOnboarded, router]);

  if (isValid) {
    return <ActivityIndicator testID="dev-feature-flag-link" />;
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
      testID="dev-feature-flag-link"
    >
      <Text style={{ color: colors.text, fontSize: 15 }}>
        {[
          `feature_flag_override_invalid: Cannot override "${key}" with "${value}"`,
          `why: Keys are ${FEATURE_FLAGS.join(", ")}. Values are on, off, remote.`,
          "fix: Open the link with a listed key and value.",
        ].join("\n")}
      </Text>
    </View>
  );
};
