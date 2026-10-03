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
