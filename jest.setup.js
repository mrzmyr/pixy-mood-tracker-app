globalThis.URL = require("node:url").URL;
globalThis.URLSearchParams = require("node:url").URLSearchParams;

// oxlint-disable-next-line anti-slop/no-module-mocking -- posthog-react-native needs native modules that do not exist in Jest; every provider test needs this fake client
jest.mock("posthog-react-native", () => {
  const client = {
    capture: jest.fn(),
    identify: jest.fn(),
    optIn: jest.fn(),
    optOut: jest.fn(),
    reset: jest.fn(),
    screen: jest.fn(),
    register: jest.fn(),
    reloadFeatureFlagsAsync: jest.fn(),
    setPersonProperties: jest.fn(),
  };

  return {
    PostHogProvider: ({ children }) => children,
    usePostHog: () => client,
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-alternate-app-icons is a native module; the settings entry file loads it during provider tests
jest.mock("expo-alternate-app-icons", () => ({
  supportsAlternateIcons: true,
  getAppIconName: jest.fn(() => null),
  setAlternateAppIcon: jest.fn((name) => Promise.resolve(name)),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load logger exports during provider tests; native carousel is unavailable in Jest.
jest.mock("react-native-reanimated-carousel", () => ({ Carousel: () => null }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load animated UI during provider tests; native worklets are unavailable in Jest.
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const animation = { duration: () => animation, delay: () => animation };
  return {
    __esModule: true,
    default: { View },
    createAnimatedComponent: (component) => component,
    css: { create: (styles) => styles },
    cubicBezier: () => "ease-out",
    FadeIn: animation,
    FadeInDown: animation,
    FadeInRight: animation,
    FadeInUp: animation,
    FadeOut: animation,
    FadeOutUp: animation,
    Keyframe: class {
      delay() {
        return this;
      }
      duration() {
        return this;
      }
    },
    Extrapolation: { CLAMP: "clamp" },
    Easing: { cubic: (t) => t, quad: (t) => t, in: (f) => f, inOut: (f) => f },
    cancelAnimation: jest.fn(),
    interpolate: () => 0,
    useReducedMotion: () => false,
    useSharedValue: (initial) => {
      let current = initial;
      return { get: () => current, set: (next) => (current = next) };
    },
    useAnimatedStyle: (worklet) => worklet(),
    withSpring: (value) => value,
    withTiming: (value) => value,
    withDelay: (_delay, value) => value,
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- the toast and the photo viewer schedule JS callbacks from worklets; the native worklets runtime is unavailable in Jest.
jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (fn, ...args) => fn(...args),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the toast swipe uses native gesture handlers that Jest cannot run.
jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return {
    GestureDetector: ({ children }) => children,
    GestureHandlerRootView: View,
    usePanGesture: () => ({}),
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load calendar UI; FlashList's ESM build is unavailable to Jest.
jest.mock("@shopify/flash-list", () => ({ FlashList: () => null }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load icon UI; Jest does not transform lucide's ESM build.
jest.mock(
  "lucide-react-native",
  () => new Proxy({}, { get: () => require("react-native").View })
);

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load calendar UI; the native sheet has no Jest view.
jest.mock("@expo/ui", () => ({
  BottomSheet: () => null,
  RNHostView: () => null,
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load the widget sync; the ExpoWidgets native module does not exist in Jest.
jest.mock("expo-widgets", () => ({
  createWidget: () => ({
    reload: () => null,
    updateTimeline: () => null,
    updateSnapshot: () => null,
    getTimeline: () => Promise.resolve([]),
  }),
  widgetsDirectory: "",
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the widget sync captures the year grid; view-shot has no native module in Jest.
jest.mock("react-native-view-shot", () => ({
  captureRef: () => Promise.resolve(""),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-contacts subclasses a native module at import time, which is unavailable in Jest; people tests use the sources override.
jest.mock("expo-contacts", () => ({
  Contact: { presentPicker: jest.fn() },
  requestPermissionsAsync: jest.fn(),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- HealthKit loads a Nitro native module at import time, which is unavailable in Jest; health tests use the source override.
jest.mock("@kingstinct/react-native-healthkit", () => ({
  CategoryValueSleepAnalysis: {
    inBed: 0,
    asleep: 1,
    awake: 2,
    asleepCore: 3,
    asleepDeep: 4,
    asleepREM: 5,
  },
  isHealthDataAvailable: () => false,
  queryCategorySamples: () => Promise.resolve([]),
  requestAuthorization: () => Promise.resolve(true),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the native module reports no directories in Jest; avatar paths and export files need stable roots.
jest.mock("expo-file-system/legacy", () => ({
  __esModule: true,
  ...jest.requireActual("expo-file-system/legacy"),
  documentDirectory: "file:///documents/",
  cacheDirectory: "file:///cache/",
}));
