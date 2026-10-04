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

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load logger exports during provider tests; native carousel is unavailable in Jest.
jest.mock("react-native-reanimated-carousel", () => ({ Carousel: () => null }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load animated UI during provider tests; native worklets are unavailable in Jest.
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const animation = { duration: () => animation, delay: () => animation };
  return {
    __esModule: true,
    default: { View },
    FadeIn: animation,
    FadeInDown: animation,
    FadeInRight: animation,
    FadeInUp: animation,
    FadeOut: animation,
    FadeOutUp: animation,
    useSharedValue: (value) => ({ get: () => value, set: jest.fn() }),
    useAnimatedStyle: () => ({}),
    withSpring: (value) => value,
    withTiming: (value) => value,
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- the toast imports worklets; the native worklets runtime is unavailable in Jest.
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

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-contacts subclasses a native module at import time, which is unavailable in Jest; people tests use the sources override.
jest.mock("expo-contacts", () => ({
  Contact: { presentPicker: jest.fn() },
  requestPermissionsAsync: jest.fn(),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- the native module reports no directories in Jest; avatar paths and export files need stable roots.
jest.mock("expo-file-system/legacy", () => ({
  __esModule: true,
  ...jest.requireActual("expo-file-system/legacy"),
  documentDirectory: "file:///documents/",
  cacheDirectory: "file:///cache/",
}));
