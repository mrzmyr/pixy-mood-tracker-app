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

const SHADOW_NODE_FIX_MARKER = "fixFindShadowNodeByTagRaceCondition";

const SHADOW_NODE_FIX_IMPORTS = `
import android.util.Log
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Canary_Android
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Experimental_Android
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android
import com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsProvider`;

const SHADOW_NODE_FIX_CALL = `
    // React Native 0.86 ships this fix behind a flag that is off by default.
    // Remove this block with React Native 0.87, which always applies it.
    // https://github.com/react/react-native/pull/56850
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
    if (accessedFlags != null) {
      Log.w("PixyFeatureFlags", "Flags read before override: $accessedFlags")
    }`;

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
 * Concurrent commits can free the shadow tree root while
 * `findShadowNodeByTag_DEPRECATED` walks it, which crashes Android. React
 * Native 0.86 has the fix behind `fixFindShadowNodeByTagRaceCondition`. This
 * turns the flag on and keeps every other flag at its release-level value.
 * `loadReactNative` already sets the flags, so only a force override works.
 */
const withShadowNodeLookupFix = (config: ExpoConfig) =>
  withMainApplication(config, (mainApplication) => {
    const { contents } = mainApplication.modResults;
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
    })
  );
};

export default appConfig;
