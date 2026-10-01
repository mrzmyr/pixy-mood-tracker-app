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
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load calendar UI; FlashList's ESM build is unavailable to Jest.
jest.mock("@shopify/flash-list", () => ({ FlashList: () => null }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load icon UI; Jest does not transform lucide's ESM build.
jest.mock(
  "lucide-react-native",
  () => new Proxy({}, { get: () => require("react-native").View })
);

// Renders an Expo UI container's children as plain React Native children.
const mockPassthrough = ({ children }) => children ?? null;
// `FieldGroup` carries slot components, so it needs its own function object.
const mockFieldGroup = ({ children }) => children ?? null;

// oxlint-disable-next-line anti-slop/no-module-mocking -- feature entry files load calendar and settings UI; native Expo UI views have no Jest view.
jest.mock("@expo/ui", () => {
  const { Text } = require("react-native");

  return {
    BottomSheet: () => null,
    FieldGroup: Object.assign(mockFieldGroup, {
      Section: mockPassthrough,
      SectionHeader: mockPassthrough,
      SectionFooter: mockPassthrough,
    }),
    Host: mockPassthrough,
    Icon: Object.assign(() => null, { select: (spec) => spec.ios }),
    RNHostView: mockPassthrough,
    Text: ({ children }) => <Text>{children}</Text>,
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- iOS settings rows render SwiftUI views; Jest renders them as React Native views.
jest.mock("@expo/ui/swift-ui", () => {
  const { Pressable, Text } = require("react-native");

  return {
    Button: ({ onPress, testID, children }) => (
      <Pressable accessibilityRole="button" onPress={onPress} testID={testID}>
        {children}
      </Pressable>
    ),
    HStack: mockPassthrough,
    Image: () => null,
    Label: ({ title }) => <Text>{title}</Text>,
    NavigationStack: mockPassthrough,
    Spacer: () => null,
  };
});
