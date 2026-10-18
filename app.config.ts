import type { ConfigContext, ExpoConfig } from "@expo/config";
import { withGradleProperties } from "expo/config-plugins";

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

const appConfig = ({ config }: ConfigContext): ExpoConfig => {
  const variant = APP_VARIANTS[getAppVariant()];
  return withGradleMemory({
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
      intentFilters: [
        ...(config.android?.intentFilters ?? []),
        // Alternate app icons disable MainActivity and launch an
        // activity-alias. expo-alternate-app-icons copies only
        // `android.intentFilters` into each alias, not the scheme filter
        // Expo adds to MainActivity. Without this entry, scheme links stop
        // opening the app while an alternate icon is active.
        {
          action: "VIEW",
          category: ["BROWSABLE", "DEFAULT"],
          data: [{ scheme: variant.scheme }],
        },
      ],
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
  });
};

export default appConfig;
