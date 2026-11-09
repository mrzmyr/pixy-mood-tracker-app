import { Column, Picker, Row, Spacer, Text } from "@expo/ui";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { useContext, useState, useSyncExternalStore } from "react";
import {
  SettingsForm,
  SettingsRow,
  SettingsSection,
} from "@/components/settings-form";
import { useSecondaryText } from "@/components/settings-form/platform";
import useColors from "@/hooks/use-colors";
import {
  FeatureFlagsContext,
  getFeatureFlagState,
} from "@/state/feature-flags/context";
import type {
  FeatureFlagState,
  RemoteFlags,
} from "@/state/feature-flags/context";
import {
  FEATURE_FLAG_DETAILS,
  FEATURE_FLAGS,
} from "@/state/feature-flags/keys";
import type { FeatureFlag } from "@/state/feature-flags/keys";
import {
  getOverrides,
  IS_OVERRIDE_BUILD,
  OVERRIDE_ACCESS_FLAG,
  setOverride,
  setOverrides,
  subscribe,
} from "@/state/feature-flags/overrides";
import type { FeatureFlagOverride } from "@/state/feature-flags/overrides";

/**
 * Flags that read the remote value only: the override access flag, and the
 * App Lock bypass, which ignores overrides on purpose. They show their state
 * but no picker.
 */
const REMOTE_ONLY_FLAGS: readonly FeatureFlag[] = [
  OVERRIDE_ACCESS_FLAG,
  "app-lock-bypass",
];

const OVERRIDABLE_FLAGS = FEATURE_FLAGS.filter(
  (flag) => !REMOTE_ONLY_FLAGS.includes(flag)
);

const STATE_LABELS: Record<FeatureFlagState, string> = {
  on: "On",
  off: "Off",
  loading: "Loading",
};

interface FlagItem {
  flag: FeatureFlag;
  state: FeatureFlagState;
  /** Value without an override: remote flag, or off without remote flags. */
  defaultState: FeatureFlagState;
  override: "on" | "off" | undefined;
  isRemoteOnly: boolean;
}

/** Case-insensitive match on key, description, and location. */
const isMatch = (flag: FeatureFlag, query: string) => {
  const needle = query.trim().toLowerCase();
  const { description, location } = FEATURE_FLAG_DETAILS[flag];
  return [flag, description, location].some((text) =>
    text.toLowerCase().includes(needle)
  );
};

/**
 * Remote flag status for the overview: why every default can read Off.
 * Flags load only with analytics consent.
 */
const getRemoteStatus = ({
  flags,
  isLoading,
  hasLoadFailed,
}: {
  flags: RemoteFlags | null;
  isLoading: boolean;
  hasLoadFailed?: boolean;
}) => {
  if (isLoading) {
    return { value: "Loading", footer: "Defaults load from remote config." };
  }
  if (hasLoadFailed) {
    return {
      value: "Failed",
      footer:
        "Remote config did not load, so every default is Off. Check the connection, then restart the app.",
    };
  }
  if (flags === null) {
    return {
      value: "Not Loaded",
      footer:
        "Remote config loads only with consent: Settings > Privacy > Behavioral Data. Until then every default is Off.",
    };
  }
  return {
    value: "Loaded",
    footer: "Default: value from remote config for this device.",
  };
};

/** One flag: key and what it gates, then its state or an override picker. */
const FlagRow = ({ item }: { item: FlagItem }) => {
  const colors = useColors();
  const secondary = useSecondaryText();
  const { description } = FEATURE_FLAG_DETAILS[item.flag];

  return (
    <Row alignment="center" spacing={12} testID={`feature-flag-${item.flag}`}>
      <Column alignment="start" spacing={2}>
        <Text>{item.flag}</Text>
        <Text
          textStyle={{ fontSize: 13, color: colors.textSecondary }}
          numberOfLines={2}
        >
          {description}
        </Text>
      </Column>
      <Spacer flexible />
      {item.isRemoteOnly ? (
        <Text textStyle={secondary.textStyle} modifiers={secondary.modifiers}>
          {STATE_LABELS[item.state]}
        </Text>
      ) : (
        <Picker
          selectedValue={item.override ?? "remote"}
          onValueChange={(value: FeatureFlagOverride) =>
            setOverride({ key: item.flag, value })
          }
          testID={`feature-flag-${item.flag}-picker`}
        >
          <Picker.Item
            label={`Default (${STATE_LABELS[item.defaultState]})`}
            value="remote"
          />
          <Picker.Item label="On" value="on" />
          <Picker.Item label="Off" value="off" />
        </Picker>
      )}
    </Row>
  );
};

/**
 * Section of flags in one state, or `null` without flags. A function, not a
 * component: `SettingsForm` reads only direct `SettingsSection` children.
 */
const renderFlagSection = (title: string, items: FlagItem[]) =>
  items.length === 0 ? null : (
    <SettingsSection title={`${title} (${items.length})`}>
      {items.map((item) => (
        <FlagRow key={item.flag} item={item} />
      ))}
    </SettingsSection>
  );

/**
 * Settings > Development > Feature flags: which flags are on for this
 * device, grouped On, Off, and Loading, with a search in the header. Each
 * flag overrides its remote default until the app restarts. Reachable in
 * development and preview builds, and in production while the
 * `feature-flag-overrides` flag is on.
 */
export const FeatureFlagsScreen = () => {
  const colors = useColors();
  const remote = useContext(FeatureFlagsContext);
  const overrides = useSyncExternalStore(subscribe, getOverrides);
  const [query, setQuery] = useState("");

  const items: FlagItem[] = FEATURE_FLAGS.map((flag) => {
    const isRemoteOnly = REMOTE_ONLY_FLAGS.includes(flag);
    const override = isRemoteOnly ? undefined : overrides[flag];
    const isRemoteOn = remote.flags?.[flag] === true;
    return {
      flag,
      isRemoteOnly,
      override,
      state: getFeatureFlagState({
        override,
        isLoading: remote.isLoading,
        isRemoteOn,
      }),
      defaultState: getFeatureFlagState({
        override: undefined,
        isLoading: remote.isLoading,
        isRemoteOn,
      }),
    };
  });
  const matches = items.filter((item) => isMatch(item.flag, query));
  const isSearching = query.trim() !== "";
  const onCount = items.filter((item) => item.state === "on").length;
  const overrideCount = items.filter((item) => item.override).length;
  const status = getRemoteStatus(remote);

  return (
    <>
      <SettingsForm>
        {isSearching ? null : (
          <SettingsSection title="Overview" footer={status.footer}>
            <SettingsRow
              title="On for You"
              value={`${onCount} of ${items.length}`}
              testID="feature-flags-on-count"
            />
            <SettingsRow
              title="Overrides"
              value={`${overrideCount}`}
              testID="feature-flags-override-count"
            />
            <SettingsRow
              title="Remote Config"
              value={status.value}
              testID="feature-flags-remote-status"
            />
          </SettingsSection>
        )}
        {renderFlagSection(
          "On",
          matches.filter((item) => item.state === "on")
        )}
        {renderFlagSection(
          "Off",
          matches.filter((item) => item.state === "off")
        )}
        {renderFlagSection(
          "Loading",
          matches.filter((item) => item.state === "loading")
        )}
        {isSearching && matches.length === 0 ? (
          <SettingsSection>
            <SettingsRow title="No Matching Flags" />
          </SettingsSection>
        ) : null}
        {isSearching ? null : (
          <SettingsSection
            title="All Flags"
            footer={
              IS_OVERRIDE_BUILD
                ? `Overrides end when the app restarts. Tests set an override with ${Linking.createURL("dev/feature-flag")}?key=<key>&value=on|off|remote.`
                : "Overrides end when the app restarts."
            }
          >
            <SettingsRow
              title="Reset All Overrides"
              onPress={
                overrideCount > 0
                  ? () =>
                      setOverrides({ keys: OVERRIDABLE_FLAGS, value: "remote" })
                  : undefined
              }
              testID="feature-flag-all-remote"
            />
            <SettingsRow
              title="Turn All On"
              onPress={() =>
                setOverrides({ keys: OVERRIDABLE_FLAGS, value: "on" })
              }
              testID="feature-flag-all-on"
            />
            <SettingsRow
              title="Turn All Off"
              onPress={() =>
                setOverrides({ keys: OVERRIDABLE_FLAGS, value: "off" })
              }
              testID="feature-flag-all-off"
            />
          </SettingsSection>
        )}
      </SettingsForm>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: "Search Flags",
            autoCapitalize: "none",
            hideWhenScrolling: false,
            obscureBackground: false,
            tintColor: colors.tint,
            textColor: colors.text,
            hintTextColor: colors.textSecondary,
            headerIconColor: colors.text,
            onChangeText: (event) => setQuery(event.nativeEvent.text),
            onCancelButtonPress: () => setQuery(""),
            onClose: () => setQuery(""),
          },
        }}
      />
    </>
  );
};
