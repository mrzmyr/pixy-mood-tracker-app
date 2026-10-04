import type { ConfigContext, ExpoConfig } from "@expo/config";
import { withGradleProperties, withMainApplication } from "expo/config-plugins";

/**
 * App variants, installable side by side on one device.
 * https://docs.expo.dev/tutorial/eas/multiple-app-variants/
 *
 * - `development`: dev client that loads JavaScript from Metro.
 * - `preview`: release build with developer tools, for e2e and manual QA.
 * - `production`: the TestFlight, App Store, and Google Play build.
 *
 * Each variant has its own URL scheme, so a link opens the intended app.
 */
export const APP_VARIANTS = {
  development: {
    name: "Pixy Dev",
    appId: "com.devmood.pixymoodtracker.dev",
    scheme: "pixy-dev",
    icon: "./assets/images/icon-dev.png",
    adaptiveIcon: "./assets/images/adaptive-icon-dev.png",
  },
  preview: {
    name: "Pixy Preview",
    appId: "com.devmood.pixymoodtracker.preview",
    scheme: "pixy-preview",
    icon: "./assets/images/icon-preview.png",
    adaptiveIcon: "./assets/images/adaptive-icon-preview.png",
  },
  production: {
    name: "Pixy",
    appId: "com.devmood.pixymoodtracker",
    scheme: "pixy",
    icon: "./assets/images/icon.png",
    adaptiveIcon: "./assets/images/adaptive-icon.png",
  },
} as const;

/** Name of an app variant: `development`, `preview`, or `production`. */
export type AppVariant = keyof typeof APP_VARIANTS;

/**
 * Home screen widgets (iOS). Each entry is one widget kind in the gallery.
 * The `name` must match the first argument of `createWidget` in
 * `src/features/widget/widgets`.
 */
export const WIDGETS = [
  {
    name: "PixyCheckIn",
    displayName: "Check-in",
    description: "Log your mood with one tap.",
    ios: { supportedFamilies: ["systemMedium"] },
  },
  {
    name: "PixyWeek",
    displayName: "4 weeks",
    description: "Your pixels for the last four weeks.",
    ios: { supportedFamilies: ["systemSmall", "systemMedium"] },
  },
  {
    name: "PixyMonth",
    displayName: "Month",
    description: "Your pixels for this month.",
    ios: { supportedFamilies: ["systemSmall", "systemMedium", "systemLarge"] },
  },
  {
    name: "PixyYear",
    displayName: "Year",
    description: "Your pixels for this year.",
    ios: { supportedFamilies: ["systemMedium", "systemLarge"] },
  },
];

const isAppVariant = (value: string): value is AppVariant =>
  Object.hasOwn(APP_VARIANTS, value);

/** Reads `EXPO_PUBLIC_APP_VARIANT`. Every native build and update sets it. */
export const getAppVariant = (
  value = process.env.EXPO_PUBLIC_APP_VARIANT
): AppVariant => {
  if (value && isAppVariant(value)) {
    return value;
  }
  const why = value
    ? `EXPO_PUBLIC_APP_VARIANT is "${value}".`
    : "EXPO_PUBLIC_APP_VARIANT is not set.";
  const fix = `Set EXPO_PUBLIC_APP_VARIANT to ${Object.keys(APP_VARIANTS).join(", ")}. \`bun ios\`, \`bun android\`, and eas.json profiles set it.`;
  // Expo prints only the message, so it repeats why and fix.
  throw Object.assign(new Error(`Unknown app variant. ${why} ${fix}`), {
    fix,
    status: "app_variant_invalid",
    why,
  });
};

/**
 * Gradle JVM memory. The React Native default (`-Xmx2048m
 * -XX:MaxMetaspaceSize=512m`) runs out of Metaspace in release builds
 * (`> Metaspace`), so this doubles both.
 */
const GRADLE_JVM_ARGS = "-Xmx4096m -XX:MaxMetaspaceSize=1024m";

const withGradleMemory = (config: ExpoConfig) =>
  withGradleProperties(config, (gradle) => {
    gradle.modResults = [
      ...gradle.modResults.filter(
        (item) =>
          !(item.type === "property" && item.key === "org.gradle.jvmargs")
      ),
      { type: "property", key: "org.gradle.jvmargs", value: GRADLE_JVM_ARGS },
    ];
    return gradle;
  });

/** Flag name. Its presence in `MainApplication.kt` marks the fix as added. */
const SHADOW_NODE_FIX_MARKER = "fixFindShadowNodeByTagRaceCondition";

/** Kotlin imports, added after the `DefaultNewArchitectureEntryPoint` import. */
const SHADOW_NODE_FIX_IMPORTS = `
import android.util.Log
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Canary_Android
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Experimental_Android
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsProvider`;

/**
 * Kotlin block, added after `loadReactNative(this)`. The comments land in the
 * generated `MainApplication.kt`, for readers of the native project.
 */
const SHADOW_NODE_FIX_CALL = `
    // Pixy: turn on React Native's fix for a shadow node lookup crash.
    // Concurrent commits can free the shadow tree root while
    // findShadowNodeByTag_DEPRECATED walks it. React Native 0.86 has the fix
    // behind fixFindShadowNodeByTagRaceCondition, off by default.
    // REMOVE WHEN react-native is 0.87.0 or later: the flag is gone and the fix
    // is always on. Source: withShadowNodeLookupFix in app.config.ts.
    // https://github.com/react/react-native/pull/56850
    //
    // loadReactNative already set the flags, so a second override() throws.
    // Force override with the same release-level flags plus this one flag.
    val releaseFlags: ReactNativeFeatureFlagsProvider =
      when (DefaultNewArchitectureEntryPoint.releaseLevel) {
        ReleaseLevel.EXPERIMENTAL -> ReactNativeFeatureFlagsOverrides_RNOSS_Experimental_Android()
        ReleaseLevel.CANARY -> ReactNativeFeatureFlagsOverrides_RNOSS_Canary_Android()
        ReleaseLevel.STABLE -> ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android()
      }
    val accessedFlags = ReactNativeFeatureFlags.dangerouslyForceOverride(
      object : ReactNativeFeatureFlagsProvider by releaseFlags {
        override fun ${SHADOW_NODE_FIX_MARKER}(): Boolean = true
      }
    )
    // Flags read before this line kept their old value until now.
    if (accessedFlags != null) {
      Log.w("PixyFeatureFlags", "Flags read before override: $accessedFlags")
    }`;

/**
 * Inserts `addition` after `anchor`. Throws when the anchor is missing, so a
 * changed Expo template fails prebuild instead of silently losing the fix.
 */
const insertAfter = (source: string, anchor: string, addition: string) => {
  if (!source.includes(anchor)) {
    const why = `MainApplication.kt has no \`${anchor}\`.`;
    const fix =
      "Update withShadowNodeLookupFix in app.config.ts for the new Expo template.";
    throw Object.assign(
      new Error(`Cannot enable shadow node lookup fix. ${why} ${fix}`),
      { fix, status: "main_application_anchor_missing", why }
    );
  }
  return source.replace(anchor, `${anchor}${addition}`);
};

/**
 * Android crash fix: shadow node lookup during concurrent commits.
 *
 * REMOVE WHEN: `react-native` in package.json is 0.87.0 or later (Expo SDK
 * 58). The Android build tells you: React Native 0.87 deletes the flag, so
 * the generated Kotlin fails with "'fixFindShadowNodeByTagRaceCondition'
 * overrides nothing".
 *
 * To remove:
 * 1. Delete this plugin, `insertAfter`, and the `SHADOW_NODE_FIX_*`
 *    constants above.
 * 2. Remove `withShadowNodeLookupFix(...)` from `appConfig`.
 * 3. Remove `withMainApplication` from the `expo/config-plugins` import.
 * 4. Run `bun android` and confirm the calendar still scrolls without a crash.
 *
 * Problem:
 * - `UIManager::findShadowNodeByTag_DEPRECATED` walks the shadow tree from
 *   the root node to find a view by its tag.
 * - React Native 0.86 reads the root through a raw pointer. A concurrent
 *   commit can replace the root and free the old one during the walk.
 * - The walk then reads freed memory: native crash (use after free).
 * - Pixy hits this on Android when the user scrolls the calendar fast.
 *
 * Upstream fix:
 * - The fix holds a `shared_ptr` to the current revision root, so the root
 *   stays alive for the whole walk.
 * - React Native 0.86.3 already contains the fix, but only behind the
 *   feature flag `fixFindShadowNodeByTagRaceCondition`. The flag is off by
 *   default.
 * - React Native 0.87.0 removes the flag and always applies the fix:
 *   https://github.com/react/react-native/pull/56850 (commit 8636cadb).
 *
 * What this plugin does:
 * - It adds Kotlin to `MainApplication.onCreate`, right after
 *   `loadReactNative(this)`, that turns the flag on.
 * - The prebuilt React Native binary already contains the flag-gated code,
 *   so no C++ patch and no React Native source build is needed (see #449 for
 *   the patch approach this replaces).
 * - Android only. iOS does not change.
 *
 * Why `dangerouslyForceOverride`:
 * - `loadReactNative` already calls `ReactNativeFeatureFlags.override()` for
 *   the release level. A second `override()` throws "Feature flags cannot be
 *   overridden more than once".
 * - `dangerouslyForceOverride` replaces the provider instead. It returns the
 *   names of flags that were read before the replacement. The Kotlin logs
 *   them with the `PixyFeatureFlags` tag. On a Pixel 8 it returned null: no
 *   flag was read before, so no flag changed value mid-launch.
 *
 * Why delegate to the release-level provider:
 * - `MainApplication` picks Stable, Canary, or Experimental flags from
 *   `BuildConfig.REACT_NATIVE_RELEASE_LEVEL`.
 * - The new provider delegates every flag to that same class and changes
 *   only `fixFindShadowNodeByTagRaceCondition`. All other flags keep their
 *   values.
 *
 * Check on a device:
 * - Temporarily add this line after the injected block in the generated
 *   `MainApplication.kt`, build, and read logcat:
 *   `Log.i("PixyFeatureFlags", "${ReactNativeFeatureFlags.fixFindShadowNodeByTagRaceCondition()}")`
 * - `true` means the C++ side sees the flag.
 */
const withShadowNodeLookupFix = (config: ExpoConfig) =>
  withMainApplication(config, (mainApplication) => {
    const { contents } = mainApplication.modResults;
    // Prebuild without --clean reuses MainApplication.kt. Skip a second insert.
    if (contents.includes(SHADOW_NODE_FIX_MARKER)) {
      return mainApplication;
    }
    mainApplication.modResults.contents = insertAfter(
      insertAfter(
        contents,
        "import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint",
        SHADOW_NODE_FIX_IMPORTS
      ),
      "loadReactNative(this)",
      SHADOW_NODE_FIX_CALL
    );
    return mainApplication;
  });

const appConfig = ({ config }: ConfigContext): ExpoConfig => {
  const variant = APP_VARIANTS[getAppVariant()];
  return withShadowNodeLookupFix(
    withGradleMemory({
      ...config,
      name: variant.name,
      slug: config.slug ?? "pixy-mood-tracker",
      icon: variant.icon,
      scheme: variant.scheme,
      ios: {
        ...config.ios,
        bundleIdentifier: variant.appId,
      },
      android: {
        ...config.android,
        package: variant.appId,
        icon: variant.icon,
        adaptiveIcon: {
          ...config.android?.adaptiveIcon,
          foregroundImage: variant.adaptiveIcon,
        },
      },
      plugins: [
        ...(config.plugins ?? []),
        // Widget extension and app group follow the variant's bundle id, so
        // every variant installs side by side with its own widgets.
        [
          "expo-widgets",
          {
            bundleIdentifier: `${variant.appId}.widgets`,
            groupIdentifier: `group.${variant.appId}`,
            widgets: WIDGETS,
          },
        ],
      ],
    })
  );
};

export default appConfig;
