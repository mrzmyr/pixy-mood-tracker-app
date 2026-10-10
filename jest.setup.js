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
    getDistinctId: jest.fn(() => "test-distinct-id"),
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
    ReduceMotion: { System: "system", Always: "always", Never: "never" },
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

// oxlint-disable-next-line anti-slop/no-module-mocking -- SwiftUI has no Jest view; the stand-in keeps action labels and identifiers.
jest.mock("@expo/ui/swift-ui", () => {
  const { Pressable, View } = require("react-native");
  return {
    Host: ({ children }) => children,
    Image: () => null,
    Menu: ({ children }) => <View>{children}</View>,
    Button: ({ label, onPress, role, modifiers = [] }) => (
      <Pressable
        accessibilityRole={role ? "button" : "menuitem"}
        accessibilityLabel={label}
        testID={modifiers.find((modifier) => modifier.identifier)?.identifier}
        onPress={onPress}
      />
    ),
  };
});

const mockSwiftUiModifier = () => ({});
const mockSwiftUiOutlines = new Proxy({}, { get: () => mockSwiftUiModifier });

// oxlint-disable-next-line anti-slop/no-module-mocking -- SwiftUI modifiers build native view config; Jest ignores them.
jest.mock(
  "@expo/ui/swift-ui/modifiers",
  () =>
    new Proxy(
      {},
      {
        get: (_target, name) => {
          if (name === "accessibilityIdentifier") {
            return (identifier) => ({ identifier });
          }
          // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- export name of @expo/ui.
          if (name === "shapes") {
            return mockSwiftUiOutlines;
          }
          return mockSwiftUiModifier;
        },
      }
    )
);

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

// oxlint-disable-next-line anti-slop/no-module-mocking -- the native module reports no directories in Jest; avatar paths and export files need stable roots.
jest.mock("expo-file-system/legacy", () => ({
  __esModule: true,
  ...jest.requireActual("expo-file-system/legacy"),
  documentDirectory: "file:///documents/",
  cacheDirectory: "file:///cache/",
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-local-authentication is a native module; every provider test mounts AppLockProvider. Default: no device passcode.
jest.mock("expo-local-authentication", () => ({
  __esModule: true,
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  getEnrolledLevelAsync: jest.fn(() => Promise.resolve(0)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-clipboard is a native module; the lock screen copies the support code.
jest.mock("expo-clipboard", () => ({
  __esModule: true,
  setStringAsync: jest.fn(() => Promise.resolve(true)),
}));
